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
      // Get recent conversation summaries
      const recentConversations = await prisma.conversation.findMany({
        where: {
          userId: session.user.id,
          summary: { not: null },
        },
        orderBy: { updatedAt: "desc" },
        select: { summary: true, updatedAt: true },
        take: 3,
      });

      // Get user insights
      const userInsights = await prisma.userInsight.findMany({
        where: {
          userId: session.user.id,
          confidence: { gte: 0.4 },
        },
        orderBy: { confidence: "desc" },
        select: { content: true },
        take: 5,
      });

      // Build context string for the agent
      const contextParts: string[] = [];

      if (recentConversations.length > 0) {
        const summaries = recentConversations
          .map(c => c.summary)
          .filter(Boolean)
          .join(" | ");
        if (summaries) {
          contextParts.push(`Recent sessions: ${summaries}`);
        }
      }

      if (userInsights.length > 0) {
        const insights = userInsights.map(i => i.content).join("; ");
        contextParts.push(`About this person: ${insights}`);
      }

      if (contextParts.length > 0) {
        contextMetadata = contextParts.join("\n\n");
      }
    } catch (error) {
      console.error("Failed to fetch voice context:", error);
    }
  }

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
