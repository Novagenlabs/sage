import { AccessToken } from "livekit-server-sdk";
import { NextRequest } from "next/server";

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

  // Create access token
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: "1h", // Token valid for 1 hour
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
