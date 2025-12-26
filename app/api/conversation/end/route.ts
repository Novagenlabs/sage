import { auth } from "@/auth";
import { inngest } from "@/lib/inngest/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Unified endpoint to end a conversation (voice or text)
 * Triggers durable background processing via Inngest
 */
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { conversationId, type, transcript } = body;

    if (!conversationId) {
      return Response.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    if (!type || !["voice", "text"].includes(type)) {
      return Response.json(
        { error: "type must be 'voice' or 'text'" },
        { status: 400 }
      );
    }

    // Send event to Inngest for durable background processing
    await inngest.send({
      name: "conversation/ended",
      data: {
        conversationId,
        userId: session.user.id,
        type,
        transcript, // Only provided for voice sessions
      },
    });

    console.log(`[ConversationEnd] Queued ${type} conversation:`, conversationId);

    return Response.json({
      queued: true,
      conversationId,
      type,
    });
  } catch (error) {
    console.error("[ConversationEnd] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Failed to queue conversation: ${message}` },
      { status: 500 }
    );
  }
}
