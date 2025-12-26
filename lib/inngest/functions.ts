import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { calculateCreditsUsed, deductCredits, hasEnoughCredits } from "@/lib/credits";

// Define event types for type safety
type ConversationEndedEvent = {
  name: "conversation/ended";
  data: {
    conversationId: string;
    userId: string;
    type: "voice" | "text";
    transcript?: Array<{ role: string; content: string }>;
  };
};

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

/**
 * Durable function to process conversation end (voice or text)
 * Each step is retriable and checkpointed
 */
export const processConversationEnd = inngest.createFunction(
  {
    id: "process-conversation-end",
    retries: 3,
    onFailure: async ({ error, event }) => {
      console.error("[Inngest] processConversationEnd failed:", error, event);
    }
  },
  { event: "conversation/ended" },
  async ({ event, step }) => {
    const { conversationId, userId, type, transcript } = event.data as ConversationEndedEvent["data"];

    console.log(`[Inngest] Processing ${type} conversation:`, conversationId);

    // Step 1: Save voice messages (voice only)
    if (type === "voice" && transcript?.length) {
      await step.run("save-messages", async () => {
        console.log(`[Inngest] Saving ${transcript.length} voice messages`);
        for (const msg of transcript) {
          await prisma.message.create({
            data: {
              conversationId,
              role: msg.role as "user" | "assistant",
              content: msg.content,
              phase: "voice",
            },
          });
        }
        return { savedCount: transcript.length };
      });
    }

    // Step 2: Generate summary via LLM
    const result = await step.run("generate-summary", async (): Promise<{
      skipped?: boolean;
      reason?: string;
      summary?: string;
      insights?: Array<{ content: string; type: string }>;
      userPatterns?: Array<{ content: string; category: string; confidence: number }>;
      creditsUsed?: number;
      tokensUsed?: number;
    }> => {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY not configured");
      }

      // Check credits
      const hasCredits = await hasEnoughCredits(userId, 5);
      if (!hasCredits) {
        console.log("[Inngest] User has insufficient credits, skipping summary");
        return { skipped: true, reason: "insufficient_credits" };
      }

      // Get conversation with messages
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
        },
      });

      if (!conversation || conversation.messages.length < 2) {
        console.log("[Inngest] Not enough messages to summarize");
        return { skipped: true, reason: "insufficient_messages" };
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
          "X-Title": "Sage - Summarize",
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
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || "Unknown"}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No response from AI");
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

      // Calculate credits used
      const usage = data.usage || {};
      const promptTokens = usage.prompt_tokens || Math.ceil(conversationText.length / 4);
      const completionTokens = usage.completion_tokens || Math.ceil(content.length / 4);
      const creditsUsed = calculateCreditsUsed(promptTokens, completionTokens);

      return {
        summary: parsed.summary,
        insights: parsed.insights || [],
        userPatterns: parsed.userPatterns || [],
        creditsUsed,
        tokensUsed: promptTokens + completionTokens,
      };
    });

    // If skipped, mark inactive and return early
    if (result.skipped) {
      await step.run("mark-inactive-early", async () => {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { isActive: false },
        });
      });
      return { success: true, skipped: true, reason: result.reason };
    }

    // Step 3: Save insights to DB
    await step.run("save-insights", async () => {
      // Save summary to conversation
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { summary: result.summary },
      });
      console.log("[Inngest] Saved summary to conversation");

      // Save conversation insights
      if (result.insights && result.insights.length > 0) {
        await prisma.conversationInsight.createMany({
          data: result.insights.map((insight: { content: string; type: string }) => ({
            conversationId,
            content: insight.content,
            type: insight.type || "realization",
          })),
        });
        console.log("[Inngest] Saved", result.insights.length, "conversation insights");
      }

      // Save or update user patterns
      if (result.userPatterns && result.userPatterns.length > 0) {
        for (const pattern of result.userPatterns) {
          const existing = await prisma.userInsight.findFirst({
            where: {
              userId,
              content: { contains: pattern.content.slice(0, 50) },
            },
          });

          if (existing) {
            await prisma.userInsight.update({
              where: { id: existing.id },
              data: {
                confidence: (existing.confidence + (pattern.confidence || 0.5)) / 2,
              },
            });
          } else {
            await prisma.userInsight.create({
              data: {
                userId,
                content: pattern.content,
                category: pattern.category || "pattern",
                confidence: pattern.confidence || 0.5,
              },
            });
          }
        }
        console.log("[Inngest] Saved", result.userPatterns.length, "user patterns");
      }

      return { saved: true };
    });

    // Step 4: Update user profile summary
    await step.run("update-profile", async () => {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) return { skipped: true };

      const allInsights = await prisma.userInsight.findMany({
        where: { userId, confidence: { gte: 0.3 } },
        orderBy: { confidence: "desc" },
        take: 20,
      });

      if (allInsights.length === 0) {
        return { skipped: true, reason: "no_insights" };
      }

      const profilePrompt = `Based on these observations about a person from past conversations, write a single cohesive paragraph (3-5 sentences) summarizing what you know about them. Focus on their personality, goals, patterns, and what matters to them. Write in second person ("You tend to...").

Observations:
${allInsights.map((i) => `- ${i.content}`).join("\n")}

Write a warm, insightful summary that feels personal, not clinical. Return only the paragraph, no JSON.`;

      const profileResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "Sage - Profile Summary",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [{ role: "user", content: profilePrompt }],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        const profileSummary = profileData.choices?.[0]?.message?.content?.trim();
        if (profileSummary) {
          await prisma.user.update({
            where: { id: userId },
            data: { profileSummary },
          });
          console.log("[Inngest] Updated user profile summary");
          return { updated: true };
        }
      }

      return { updated: false };
    });

    // Step 5: Mark conversation inactive and deduct credits
    await step.run("finalize", async () => {
      // Mark inactive
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { isActive: false },
      });

      // Deduct credits
      if (result.creditsUsed && result.tokensUsed) {
        await deductCredits(
          userId,
          result.creditsUsed,
          result.tokensUsed,
          type === "voice" ? "voice" : "chat",
          "openai/gpt-4o-mini"
        );
        console.log("[Inngest] Deducted", result.creditsUsed, "credits");
      }

      return { finalized: true };
    });

    console.log("[Inngest] Conversation processing complete:", conversationId);
    return { success: true, conversationId };
  }
);

// Export all functions for the Inngest serve handler
export const functions = [processConversationEnd];
