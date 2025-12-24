import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateCreditsUsed, deductCredits, hasEnoughCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SUMMARIZE_PROMPT = `Analyze this Socratic dialogue and generate a summary for future context.

Return JSON:
{
  "summary": "A 2-3 sentence summary of what was discussed and any realizations the person had. Write in past tense. Be specific, not generic.",
  "insights": [
    {"content": "Specific insight or realization", "type": "realization|assumption|pattern|question"}
  ],
  "userPatterns": [
    {"content": "Observable pattern about this person", "category": "pattern|preference|goal|behavior", "confidence": 0.0-1.0}
  ]
}

Guidelines:
- Summary should help Sage understand context if this person returns
- Insights are specific things discovered in THIS conversation
- UserPatterns are broader observations about the person that might apply across conversations
- Quote their words where possible
- Be concrete, not abstract
- If they didn't reach conclusions, say so - don't fabricate resolution
- Confidence for patterns: 0.3 for weak signals, 0.5 for moderate, 0.8+ for strong patterns
- JSON only, no wrapper text`;

// POST /api/conversations/[id]/summarize - Generate summary and extract insights
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = session.user.id;

  // Check credits
  const minCreditsRequired = 5;
  const hasCredits = await hasEnoughCredits(userId, minCreditsRequired);
  if (!hasCredits) {
    return new Response(
      JSON.stringify({ error: "Insufficient credits for generating summary" }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OpenRouter API key not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Get conversation with messages
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (conversation.messages.length < 2) {
      return new Response(
        JSON.stringify({ error: "Not enough messages to summarize" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format conversation for analysis
    const conversationText = conversation.messages
      .map((m) => `${m.role === "user" ? "User" : "Sage"}: ${m.content}`)
      .join("\n\n");

    // Call LLM for summary
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Socratic AI - Summarize",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: SUMMARIZE_PROMPT },
          { role: "user", content: `Analyze this conversation:\n\n${conversationText}` },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          error: errorData.error?.message || `API error: ${response.status}`,
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse the response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      parsed = {
        summary: content,
        insights: [],
        userPatterns: [],
      };
    }

    console.log("[Summarize] Parsed response:", JSON.stringify(parsed, null, 2));

    // Save summary to conversation
    await prisma.conversation.update({
      where: { id },
      data: { summary: parsed.summary },
    });
    console.log("[Summarize] Saved summary to conversation");

    // Save conversation insights
    if (parsed.insights && parsed.insights.length > 0) {
      await prisma.conversationInsight.createMany({
        data: parsed.insights.map((insight: { content: string; type: string }) => ({
          conversationId: id,
          content: insight.content,
          type: insight.type || "realization",
        })),
      });
      console.log("[Summarize] Saved", parsed.insights.length, "conversation insights");
    }

    // Save or update user patterns/insights
    if (parsed.userPatterns && parsed.userPatterns.length > 0) {
      console.log("[Summarize] Processing", parsed.userPatterns.length, "user patterns");
      for (const pattern of parsed.userPatterns) {
        // Check if similar insight already exists
        const existing = await prisma.userInsight.findFirst({
          where: {
            userId,
            content: { contains: pattern.content.slice(0, 50) },
          },
        });

        if (existing) {
          // Update confidence (average with new observation)
          await prisma.userInsight.update({
            where: { id: existing.id },
            data: {
              confidence: (existing.confidence + (pattern.confidence || 0.5)) / 2,
            },
          });
          console.log("[Summarize] Updated existing user insight:", pattern.content.slice(0, 50));
        } else {
          // Create new user insight
          await prisma.userInsight.create({
            data: {
              userId,
              content: pattern.content,
              category: pattern.category || "pattern",
              confidence: pattern.confidence || 0.5,
            },
          });
          console.log("[Summarize] Created new user insight:", pattern.content.slice(0, 50));
        }
      }
    }

    // Deduct credits
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || Math.ceil(conversationText.length / 4);
    const completionTokens = usage.completion_tokens || Math.ceil(content.length / 4);
    const creditsUsed = calculateCreditsUsed(promptTokens, completionTokens);

    await deductCredits(
      userId,
      creditsUsed,
      promptTokens + completionTokens,
      "chat",
      "openai/gpt-4o-mini"
    );

    return new Response(
      JSON.stringify({
        summary: parsed.summary,
        insights: parsed.insights || [],
        userPatterns: parsed.userPatterns || [],
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error summarizing conversation:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to summarize: ${message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
