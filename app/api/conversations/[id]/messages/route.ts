import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/conversations/[id]/messages - Add message to conversation
export const POST = withAuth(async (request, authUser, { params }: RouteParams) => {
  const { id } = await params;

  try {
    const body = await request.json();
    const { role, content, phase, tokensUsed } = body;

    // Verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        role,
        content,
        phase: phase || conversation.phase,
        tokensUsed: tokensUsed || 0,
      },
    });

    // Update conversation title if this is the first user message
    if (role === "user") {
      const messageCount = await prisma.message.count({
        where: { conversationId: id, role: "user" },
      });

      if (messageCount === 1) {
        // First user message - set as title
        await prisma.conversation.update({
          where: { id },
          data: {
            title: content.slice(0, 100) + (content.length > 100 ? "..." : ""),
          },
        });
      }
    }

    // Update conversation phase if provided
    if (phase && phase !== conversation.phase) {
      await prisma.conversation.update({
        where: { id },
        data: { phase },
      });
    }

    return new Response(JSON.stringify(message), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error adding message:", error);
    return new Response(
      JSON.stringify({ error: "Failed to add message" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// GET /api/conversations/[id]/messages - Get all messages for conversation
export const GET = withAuth(async (request, authUser, { params }: RouteParams) => {
  const { id } = await params;

  try {
    // Verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    });

    return new Response(JSON.stringify(messages), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch messages" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
