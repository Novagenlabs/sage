import { prisma } from "@/lib/prisma";
import { recordUsage } from "@/lib/credits";
import {
  estimateTTSCostUsd,
  estimateLiveKitCostUsd,
} from "@/lib/credit-costs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  roomName: string;
  sessionDurationMs: number;
  llm: {
    promptTokens: number;
    completionTokens: number;
    calls: number;
  };
  tts: {
    characters: number;
    audioDurationMs: number;
    calls: number;
  };
}

/**
 * POST /api/voice/usage
 * Receives accumulated usage metrics from the LiveKit agent on session disconnect.
 * Creates analytics-only UsageRecords (does NOT deduct credits — the countdown
 * timer already handled that via /api/credits/deduct).
 */
export async function POST(request: Request) {
  // Authenticate via internal API key
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.SAGE_INTERNAL_API_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body: RequestBody = await request.json();
    const { roomName, sessionDurationMs, llm, tts } = body;

    // Find the user's most recent voice conversation that was recently active.
    // Room names use format "sage-{timestamp}-{random}" — the conversationId
    // is created asynchronously during the call, so we can't parse it from the room name.
    // Instead, look up the user's most recent conversation that has a voice UsageRecord
    // (created by /api/credits/deduct) from the timer deduction.
    const recentVoiceRecord = await prisma.usageRecord.findFirst({
      where: {
        type: "voice",
        source: "api/credits/deduct",
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Within last 5 min
      },
      orderBy: { createdAt: "desc" },
      select: { userId: true, conversationId: true },
    });

    const userId = recentVoiceRecord?.userId ?? null;
    const conversationId = recentVoiceRecord?.conversationId ?? null;

    if (!userId) {
      console.warn("[VoiceUsage] Could not find recent voice session for room:", roomName);
      return Response.json(
        { error: "Could not determine user from recent voice session" },
        { status: 400 }
      );
    }

    const sessionDurationSeconds = sessionDurationMs / 1000;
    const records: string[] = [];

    // Record LLM usage (OpenAI via agent)
    if (llm.calls > 0) {
      const id = await recordUsage({
        userId,
        conversationId: conversationId || undefined,
        type: "chat",
        service: "openai",
        category: "background",
        source: "agent/voice-session",
        tokensUsed: llm.promptTokens + llm.completionTokens,
        promptTokens: llm.promptTokens,
        completionTokens: llm.completionTokens,
        modelId: "gpt-4o-mini",
        isEstimate: false,
        metadata: { calls: llm.calls },
      });
      records.push(id);
    }

    // Record TTS usage (ElevenLabs via agent)
    if (tts.calls > 0) {
      const costUsd = estimateTTSCostUsd(tts.characters);
      const id = await recordUsage({
        userId,
        conversationId: conversationId || undefined,
        type: "tts",
        service: "elevenlabs",
        category: "background",
        source: "agent/voice-session",
        tokensUsed: tts.characters,
        costUsd,
        modelId: "eleven_flash_v2_5",
        isEstimate: true,
        durationMs: tts.audioDurationMs,
        metadata: { characters: tts.characters, calls: tts.calls },
      });
      records.push(id);
    }

    // Record LiveKit session usage
    {
      const costUsd = estimateLiveKitCostUsd(sessionDurationSeconds);
      const id = await recordUsage({
        userId,
        conversationId: conversationId || undefined,
        type: "voice",
        service: "livekit",
        category: "background",
        source: "agent/voice-session",
        tokensUsed: 0,
        costUsd,
        isEstimate: true,
        durationMs: sessionDurationMs,
        metadata: { sessionDurationSeconds: Math.round(sessionDurationSeconds) },
      });
      records.push(id);
    }

    console.log(`[VoiceUsage] Created ${records.length} analytics records for room: ${roomName}`);

    return Response.json({
      success: true,
      recordIds: records,
    });
  } catch (error) {
    console.error("[VoiceUsage] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Failed to record voice usage: ${message}` },
      { status: 500 }
    );
  }
}
