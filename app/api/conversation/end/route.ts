import { auth } from "@/auth";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TURNS = 500;

/**
 * Unified endpoint to end a conversation (voice or text).
 * Forwards the in-memory transcript to Inngest, which produces a
 * pattern-only summary. The transcript itself is never persisted.
 */
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { conversationId, type, transcript } = body as {
      conversationId?: string;
      type?: "voice" | "text" | "video";
      transcript?: Array<{ role?: string; content?: string }>;
    };

    if (!conversationId) {
      return Response.json({ error: "conversationId is required" }, { status: 400 });
    }
    if (!type || !["voice", "text", "video"].includes(type)) {
      return Response.json(
        { error: "type must be 'voice', 'text', or 'video'" },
        { status: 400 }
      );
    }

    // Verify ownership before processing
    const owned = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Sanitise transcript: shape-check, drop blanks, cap turns
    const cleanTranscript = Array.isArray(transcript)
      ? transcript
          .filter(
            (m): m is { role: "user" | "assistant"; content: string } =>
              !!m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string" &&
              m.content.trim().length > 0
          )
          .slice(0, MAX_TURNS)
      : [];

    await inngest.send({
      name: "conversation/ended",
      data: {
        conversationId,
        userId: session.user.id,
        type,
        transcript: cleanTranscript,
      },
    });

    console.log(
      `[ConversationEnd] Queued ${type} conversation ${conversationId} (${cleanTranscript.length} turns)`
    );

    return Response.json({
      queued: true,
      conversationId,
      turns: cleanTranscript.length,
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
