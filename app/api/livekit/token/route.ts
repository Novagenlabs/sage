import { AccessToken } from "livekit-server-sdk";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasEnoughCredits } from "@/lib/credits";

export async function POST(request: NextRequest) {
  // Require authentication for voice mode
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Please sign in to use voice mode." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check credits before issuing token
  const hasCredits = await hasEnoughCredits(session.user.id, 5);
  if (!hasCredits) {
    return new Response(
      JSON.stringify({ error: "Insufficient credits. Please purchase more credits to use voice mode." }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }

  const { roomName, participantName, voiceKey } = await request.json();

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return new Response(
      JSON.stringify({ error: "LiveKit credentials not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!roomName || !participantName) {
    return new Response(
      JSON.stringify({ error: "roomName and participantName are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fetch context for authenticated user
  let contextMetadata = "";
  {
    // Retry Prisma queries to handle Neon cold start connection drops
    const fetchContext = async (attempt: number): Promise<void> => {
      try {
        const contextParts: string[] = [];

        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, profileSummary: true },
        });

        if (user?.name) {
          contextParts.push(`User's name: ${user.name}`);
          console.log("[Token] User name:", user.name);
        }

        if (user?.profileSummary) {
          contextParts.push(`About this person: ${user.profileSummary}`);
          console.log("[Token] Added profile summary");
        }

        const recentConversations = await prisma.conversation.findMany({
          where: {
            userId: session.user.id,
            summary: { not: null },
          },
          orderBy: { updatedAt: "desc" },
          select: { summary: true },
          take: 5,
        });

        if (recentConversations.length > 0) {
          const summaries = recentConversations
            .map(c => c.summary)
            .filter(Boolean)
            .join(" | ");
          if (summaries) {
            contextParts.push(`Recent sessions: ${summaries}`);
            console.log("[Token] Added", recentConversations.length, "recent session summaries");
          }
        }

        if (contextParts.length > 0) {
          contextMetadata = contextParts.join("\n\n");
          console.log("[Token] Final context metadata length:", contextMetadata.length, "chars");
        }
      } catch (error) {
        if (attempt < 2) {
          console.warn(`[Token] DB query failed (attempt ${attempt + 1}), retrying...`, error);
          await new Promise(r => setTimeout(r, 500));
          return fetchContext(attempt + 1);
        }
        console.error("Failed to fetch voice context after retries:", error);
      }
    };

    await fetchContext(0);
  }

  // Include voice key in metadata for agent TTS selection
  if (voiceKey) {
    contextMetadata = contextMetadata
      ? `${contextMetadata}\n\nVoice: ${voiceKey}`
      : `Voice: ${voiceKey}`;
    console.log("[Token] Voice key:", voiceKey);
  }

  console.log("[Token] Context metadata:", contextMetadata ? `${contextMetadata.slice(0, 200)}...` : "NONE");

  // Create access token with context metadata
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: "1h",
    metadata: contextMetadata || undefined,
  });

  // Grant permissions
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return new Response(
    JSON.stringify({
      token,
      url: process.env.LIVEKIT_URL,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
