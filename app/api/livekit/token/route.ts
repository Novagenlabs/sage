import { AccessToken } from "livekit-server-sdk";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { roomName, participantName } = await request.json();

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

  // Fetch context for authenticated users
  let contextMetadata = "";
  const session = await auth();
  if (session?.user?.id) {
    try {
      // Build context string for the agent
      const contextParts: string[] = [];

      // Get user's name and profile summary
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, profileSummary: true },
      });

      if (user?.name) {
        contextParts.push(`User's name: ${user.name}`);
        console.log("[Token] User name:", user.name);
      }

      // Add consolidated profile summary (replaces individual insights)
      if (user?.profileSummary) {
        contextParts.push(`About this person: ${user.profileSummary}`);
        console.log("[Token] Added profile summary");
      }

      // Fetch recent conversation summaries for additional context (last 5)
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
      console.error("Failed to fetch voice context:", error);
    }
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
