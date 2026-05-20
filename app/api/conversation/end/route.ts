import { withAuth } from "@/lib/with-auth";
import { inngest } from "@/lib/inngest/client";
import { calculateCreditsUsed, deductCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Unified endpoint to end a conversation (voice or text)
 * Triggers durable background processing via Inngest
 */
export const POST = withAuth(async (req, authUser) => {
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

    // Deduct credits for voice calls based on transcript length
    if (type === "voice" && transcript?.length > 0) {
      const totalChars = transcript.reduce(
        (sum: number, msg: { content?: string }) => sum + (msg.content?.length || 0),
        0
      );
      const estimatedTokens = Math.ceil(totalChars / 4);
      const creditsUsed = Math.max(5, calculateCreditsUsed(estimatedTokens, 0));
      await deductCredits(authUser.id, creditsUsed, estimatedTokens, "voice");
      console.log(`[ConversationEnd] Deducted ${creditsUsed} credits for voice call (${estimatedTokens} est. tokens)`);
    }

    // Send event to Inngest for durable background processing
    await inngest.send({
      name: "conversation/ended",
      data: {
        conversationId,
        userId: authUser.id,
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
});
