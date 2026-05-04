import { auth } from "@/auth";
import { buildSystemPrompt, type DialoguePhase, type ConversationContext } from "@/lib/prompts";
import { calculateCreditsUsed, deductCredits, hasEnoughCredits } from "@/lib/credits";
import { inngest } from "@/lib/inngest/client";
import { isMockMode, mockChatResponse } from "@/lib/load-test-mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  modelId: string;
  phase: DialoguePhase;
  sessionStartTime?: number; // Unix timestamp when session started
  context?: ConversationContext; // Past session summaries and user insights
  conversationId?: string; // For usage tracking attribution
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${i + 1} failed:`, (error as Error).message);
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw lastError;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = session.user.id;

  // Load-test escape hatch. When LOAD_TEST_MOCK=1 (non-prod only) we skip
  // the OpenRouter call entirely and stream a canned reply, so k6 can hit
  // this endpoint at scale without paying for real LLM tokens.
  if (isMockMode()) {
    return mockChatResponse();
  }

  const minCreditsRequired = 5;
  const hasCredits = await hasEnoughCredits(userId, minCreditsRequired);
  if (!hasCredits) {
    return new Response(
      JSON.stringify({ error: "Insufficient credits. Please purchase more credits to continue." }),
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
    const { messages, modelId, phase, sessionStartTime, context, conversationId } = body;

    // Calculate session duration in minutes
    const sessionMinutes = sessionStartTime
      ? Math.floor((Date.now() - sessionStartTime) / 60000)
      : undefined;

    // Build system prompt with phase context, time awareness, and conversation history
    const systemPrompt = buildSystemPrompt(phase, sessionMinutes, context);

    const apiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const response = await fetchWithRetry(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "Socratic AI",
        },
        body: JSON.stringify({
          model: modelId,
          messages: apiMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 1024,
          user: userId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          error: errorData.error?.message || `API error: ${response.status}`
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const promptTokens = apiMessages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    let completionTokens = 0;
    let generationId: string | null = null;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            controller.enqueue(value);

            const text = decoder.decode(value, { stream: true });
            const lines = text.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                  const json = JSON.parse(line.slice(6));
                  // Capture generation ID from OpenRouter response
                  if (json.id && !generationId) {
                    generationId = json.id;
                  }
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    completionTokens += Math.ceil(content.length / 4);
                  }
                } catch {
                  // Skip parsing errors
                }
              }
            }
          }

          // Close stream immediately so user sees response end with zero lag
          controller.close();

          // Deduct credits and reconcile in background (stream already closed)
          const creditsUsed = calculateCreditsUsed(promptTokens, completionTokens);
          const totalTokens = promptTokens + completionTokens;

          deductCredits(userId, creditsUsed, totalTokens, "chat", modelId, {
            service: "openrouter",
            category: "user",
            conversationId: conversationId || undefined,
            source: "api/chat",
            promptTokens,
            completionTokens,
            isEstimate: true,
          }).then((deductResult) => {
            if (generationId && deductResult.success && deductResult.usageRecordId) {
              inngest.send({
                name: "usage/reconcile",
                data: {
                  generationId,
                  usageRecordId: deductResult.usageRecordId,
                },
              }).catch((err: Error) => {
                console.error("[Chat] Failed to queue reconciliation:", err.message);
              });
            }
          }).catch((err: Error) => {
            console.error("[Chat] Credit deduction failed:", err.message);
          });

          // Check referral qualification on early messages
          const userMsgCount = messages.filter((m: ChatMessage) => m.role === "user").length;
          if (userMsgCount <= 5) {
            inngest.send({
              name: "referral/check-qualification",
              data: { userId },
            }).catch(() => {});
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: message.includes("abort")
          ? "Request timed out. Please try again."
          : `Connection failed: ${message}. Please try again.`
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
