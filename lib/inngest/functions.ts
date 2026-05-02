import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { calculateCreditsUsed, deductCredits, hasEnoughCredits, addCredits } from "@/lib/credits";
import { checkQualification } from "@/lib/referral";
import { REFERRAL_CONFIG } from "@/lib/referral-config";

// Define event types for type safety
type ConversationEndedEvent = {
  name: "conversation/ended";
  data: {
    conversationId: string;
    userId: string;
    type: "voice" | "text" | "video";
    transcript?: Array<{ role: string; content: string }>;
  };
};

const SUMMARIZE_PROMPT = `You are summarising a Socratic dialogue for long-term memory. The summary you produce will be stored on a server. The original conversation will NOT be stored. Therefore your output MUST contain no information that could re-identify the user or any third party.

ABSTRACTION RULES — apply rigorously:
1. Strip every proper noun. Replace specific names with roles: "a partner", "a parent", "a sibling", "a friend", "a colleague", "their child", "an ex", "a manager", "a therapist", "a teacher". Never use first names, last names, nicknames, or initials.
2. Strip places, addresses, neighbourhoods, cities, countries, named venues. Use generic categories: "their home", "their workplace", "a familiar place", "abroad", "at school".
3. Strip employers, schools, companies, products, brands, named services. Replace with categories: "their job", "their school", "a software project", "a product they use".
4. Strip specific dates, ages, ZIP codes, phone numbers, emails, URLs. Use relative time: "recently", "earlier this year", "for a long time", "as a child".
5. Strip identifying medical, financial, or legal specifics (diagnoses, dollar amounts, case numbers). Keep only the emotional or relational shape: "a health concern", "a money pressure", "a legal worry".
6. Never quote the user's exact words. Paraphrase always.
7. If a detail is required to make the summary coherent and would re-identify someone if removed, omit the surrounding sentence rather than abstract it poorly.

WHAT TO KEEP:
- Themes, emotional arcs, decisions weighed
- Recurring patterns (e.g., "tends to delay decisions when they affect someone close")
- Tensions and dilemmas in archetypal form (e.g., "a tension between independence and belonging")
- Whether the person reached resolution or sat with uncertainty

Return JSON only — no wrapper, no markdown:
{
  "summary": "2-3 sentences in past tense, second person ('you reflected on...'). Pattern-level, no specifics.",
  "insights": [
    {"content": "An insight phrased as a pattern, not a specific event", "type": "realization|assumption|pattern|question"}
  ],
  "userPatterns": [
    {"content": "A general observation about how this person tends to think, feel, or act", "category": "pattern|preference|goal|behavior", "confidence": 0.0-1.0}
  ]
}

CONFIDENCE: 0.3 weak signal, 0.5 moderate, 0.8+ strong pattern observed across multiple turns.

If the dialogue is too short or shallow to summarise meaningfully, return: {"summary": "", "insights": [], "userPatterns": []}.

Self-check before returning: scan your output for any proper noun, specific date, address, employer, or quote. If you find one, rewrite that sentence.`;

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

    // Note: as of the summary-only persistence change, transcripts are NEVER
    // written to the Message table. The full transcript travels in the event
    // payload, gets summarised in-memory, and is discarded after this run.

    // Step 1: Generate pattern-only summary via LLM (no DB read)
    const result = await step.run("generate-summary", async (): Promise<{
      skipped?: boolean;
      reason?: string;
      summary?: string;
      insights?: Array<{ content: string; type: string }>;
      userPatterns?: Array<{ content: string; category: string; confidence: number }>;
      creditsUsed?: number;
      tokensUsed?: number;
      promptTokens?: number;
      completionTokens?: number;
      isEstimate?: boolean;
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

      // Verify the conversation exists (and the user owns it) — but do NOT read messages.
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        select: { id: true },
      });

      if (!conversation) {
        console.log("[Inngest] Conversation not found or not owned by user");
        return { skipped: true, reason: "conversation_not_found" };
      }

      if (!transcript || transcript.length < 2) {
        console.log("[Inngest] Transcript missing or too short to summarise");
        return { skipped: true, reason: "insufficient_messages" };
      }

      // Format the in-memory transcript for the summariser
      const conversationText = transcript
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
      const isEstimate = !usage.prompt_tokens;
      const promptTokens = usage.prompt_tokens || Math.ceil(conversationText.length / 4);
      const completionTokens = usage.completion_tokens || Math.ceil(content.length / 4);
      const creditsUsed = calculateCreditsUsed(promptTokens, completionTokens);

      return {
        summary: parsed.summary,
        insights: parsed.insights || [],
        userPatterns: parsed.userPatterns || [],
        creditsUsed,
        tokensUsed: promptTokens + completionTokens,
        promptTokens,
        completionTokens,
        isEstimate,
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

      const profilePrompt = `You are writing a memory note about a person, in second person ("you tend to..."). The note will be stored on a server. It must contain ZERO information that could re-identify the person or anyone in their life.

ABSTRACTION RULES:
- No proper nouns. Roles only ("a partner", "a parent", "a colleague", "a friend").
- No places, employers, schools, products. Categories only ("their job", "their home").
- No specific dates or ages. Relative time only ("recently", "for a while").
- No quotes. Paraphrase only.
- Focus on personality patterns, recurring tensions, what tends to matter to them, how they tend to think and decide.

Observations:
${allInsights.map((i) => `- ${i.content}`).join("\n")}

Write 3-5 sentences. Warm and insightful, not clinical. Pattern-level, never specific. Return only the paragraph, no JSON, no preamble.`;

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

          // Track profile summary LLM call (previously untracked)
          const profileUsage = profileData.usage || {};
          const profilePromptTokens = profileUsage.prompt_tokens || Math.ceil(profilePrompt.length / 4);
          const profileCompletionTokens = profileUsage.completion_tokens || Math.ceil(profileSummary.length / 4);
          const profileCreditsUsed = calculateCreditsUsed(profilePromptTokens, profileCompletionTokens);

          await deductCredits(userId, profileCreditsUsed, profilePromptTokens + profileCompletionTokens, "profile", "openai/gpt-4o-mini", {
            service: "openrouter",
            category: "background",
            conversationId,
            source: "inngest/update-profile",
            promptTokens: profilePromptTokens,
            completionTokens: profileCompletionTokens,
            isEstimate: !profileUsage.prompt_tokens,
          });
          console.log("[Inngest] Deducted", profileCreditsUsed, "credits for profile summary");

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

      // Deduct credits for summary generation
      if (result.creditsUsed && result.tokensUsed) {
        await deductCredits(userId, result.creditsUsed, result.tokensUsed, "summary", "openai/gpt-4o-mini", {
          service: "openrouter",
          category: "background",
          conversationId,
          source: "inngest/generate-summary",
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          isEstimate: result.isEstimate,
        });
        console.log("[Inngest] Deducted", result.creditsUsed, "credits for summary");
      }

      return { finalized: true };
    });

    console.log("[Inngest] Conversation processing complete:", conversationId);
    return { success: true, conversationId };
  }
);

/**
 * Reconcile streaming chat usage with real USD cost from OpenRouter.
 * Fired after a streaming chat completes. Queries the OpenRouter generation
 * endpoint to get actual cost and native token counts, then updates the
 * UsageRecord with real data.
 *
 * Does NOT adjust user credits — the user-facing deduction already happened
 * post-stream. This is analytics-only.
 */
export const reconcileStreamingUsage = inngest.createFunction(
  {
    id: "reconcile-streaming-usage",
    retries: 2,
    onFailure: async ({ error, event }) => {
      console.error("[Inngest] reconcileStreamingUsage failed:", error, event);
    },
  },
  { event: "usage/reconcile" },
  async ({ event, step }) => {
    const { generationId, usageRecordId } = event.data as {
      generationId: string;
      usageRecordId: string;
    };

    // Wait for OpenRouter to finalize generation stats
    await step.sleep("wait-for-stats", "10s");

    const result = await step.run("fetch-generation-stats", async () => {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return { skipped: true, reason: "no_api_key" };
      }

      const response = await fetch(
        `https://openrouter.ai/api/v1/generation?id=${generationId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        console.warn(`[Reconcile] OpenRouter generation API returned ${response.status} for ${generationId}`);
        return { skipped: true, reason: `api_error_${response.status}` };
      }

      const { data } = await response.json();

      if (!data) {
        return { skipped: true, reason: "no_data" };
      }

      // Update the UsageRecord with real data
      await prisma.usageRecord.update({
        where: { id: usageRecordId },
        data: {
          costUsd: data.total_cost ?? undefined,
          promptTokens: data.native_tokens_prompt ?? undefined,
          completionTokens: data.native_tokens_completion ?? undefined,
          tokensUsed: (data.native_tokens_prompt || 0) + (data.native_tokens_completion || 0) || undefined,
          isEstimate: false,
          metadata: {
            generationId,
            model: data.model,
            providerName: data.provider_name,
            streamed: data.streamed,
            latency: data.latency,
            generationTime: data.generation_time,
            cacheDiscount: data.cache_discount,
          },
        },
      });

      console.log(`[Reconcile] Updated UsageRecord ${usageRecordId} with real cost: $${data.total_cost}`);

      return {
        updated: true,
        costUsd: data.total_cost,
        nativePromptTokens: data.native_tokens_prompt,
        nativeCompletionTokens: data.native_tokens_completion,
      };
    });

    return result;
  }
);

/**
 * Check if a referred user qualifies their referrer for a credit reward.
 * Triggered from chat route on early messages (<=5 user messages).
 */
export const processReferralQualification = inngest.createFunction(
  { id: "sage-app-process-referral-qualification" },
  { event: "referral/check-qualification" },
  async ({ event, step }) => {
    const { userId } = event.data;

    const result = await step.run("check-and-pay-referral", async () => {
      // Find pending referral where this user was referred
      const referral = await prisma.referral.findFirst({
        where: { referredUserId: userId, status: "pending" },
        select: { id: true, referrerId: true },
      });

      if (!referral) return { status: "no_pending_referral" };

      // Check if user qualifies
      const qualified = await checkQualification(userId);
      if (!qualified) return { status: "not_yet_qualified" };

      // Check referrer hasn't hit cap
      const referrerTotal = await prisma.referral.count({
        where: { referrerId: referral.referrerId, status: "qualified" },
      });
      if (referrerTotal >= REFERRAL_CONFIG.MAX_REFERRALS_PER_USER) {
        await prisma.referral.update({
          where: { id: referral.id },
          data: { status: "rejected" },
        });
        return { status: "referrer_at_cap" };
      }

      // Pay referrer
      await addCredits(referral.referrerId, REFERRAL_CONFIG.REFERRER_REWARD);
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: "qualified",
          creditsPaid: REFERRAL_CONFIG.REFERRER_REWARD,
          qualifiedAt: new Date(),
        },
      });

      return { status: "qualified", creditsPaid: REFERRAL_CONFIG.REFERRER_REWARD };
    });

    return result;
  }
);

// Export all functions for the Inngest serve handler
export const functions = [processConversationEnd, reconcileStreamingUsage, processReferralQualification];
