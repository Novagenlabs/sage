import { auth } from "@/auth";
import { calculateCreditsUsed, deductCredits, hasEnoughCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  transcript: TranscriptMessage[];
}

const INSIGHTS_PROMPT = `Extract the substance of this conversation. No fluff.

Return JSON:
{
  "summary": "What actually happened in this conversation - what did the person figure out or decide? Use their words where possible. 2 sentences max.",
  "keyPoints": ["Direct observations from the conversation - things they said or realized, not generic themes"],
  "reflections": ["Questions that came up but weren't fully answered, or natural next steps based on what they said"]
}

Rules:
- Quote or paraphrase what they actually said. "You mentioned X" not "The conversation explored X"
- No corporate speak: avoid "journey", "explore", "delve", "landscape", "unpacked", "framework"
- No cheerleading: avoid "great insight", "powerful realization", "meaningful progress"
- If they didn't reach a conclusion, say so. Don't fabricate resolution.
- 2-3 keyPoints max. Only include what's genuinely substantive.
- Reflections should be specific follow-up questions, not generic prompts like "What does this mean to you?"
- JSON only, no wrapper text`;

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = session.user.id;

  const minCreditsRequired = 3;
  const hasCredits = await hasEnoughCredits(userId, minCreditsRequired);
  if (!hasCredits) {
    return new Response(
      JSON.stringify({ error: "Insufficient credits for generating insights" }),
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
    const body: RequestBody = await request.json();
    const { transcript } = body;

    if (!transcript || transcript.length === 0) {
      return new Response(
        JSON.stringify({ error: "No transcript provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const conversationText = transcript
      .map((m) => `${m.role === "user" ? "User" : "Sage"}: ${m.content}`)
      .join("\n\n");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Socratic AI - Insights",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: INSIGHTS_PROMPT },
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

    let insights;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      insights = {
        summary: content,
        keyPoints: [],
        reflections: [],
      };
    }

    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || Math.ceil(conversationText.length / 4);
    const completionTokens = usage.completion_tokens || Math.ceil(content.length / 4);
    const creditsUsed = calculateCreditsUsed(promptTokens, completionTokens);

    await deductCredits(
      userId,
      creditsUsed,
      promptTokens + completionTokens,
      "voice",
      "openai/gpt-4o-mini"
    );

    return new Response(JSON.stringify(insights), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Insights API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to generate insights: ${message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
