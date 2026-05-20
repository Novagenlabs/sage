import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id] - Get conversation with messages
export const GET = withAuth(async (request, authUser, { params }: RouteParams) => {
  const { id } = await params;

  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: authUser.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        insights: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(conversation), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch conversation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// PUT /api/conversations/[id] - Update conversation
export const PUT = withAuth(async (request, authUser, { params }: RouteParams) => {
  const { id } = await params;

  try {
    const body = await request.json();
    const { title, phase, summary, isActive } = body;

    // Verify ownership
    const existing = await prisma.conversation.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // If setting this conversation as active, deactivate others
    if (isActive) {
      await prisma.conversation.updateMany({
        where: { userId: authUser.id, isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(phase !== undefined && { phase }),
        ...(summary !== undefined && { summary }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return new Response(JSON.stringify(conversation), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update conversation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// DELETE /api/conversations/[id] - Delete conversation
export const DELETE = withAuth(async (request, authUser, { params }: RouteParams) => {
  const { id } = await params;

  try {
    // Verify ownership
    const existing = await prisma.conversation.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    await prisma.conversation.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete conversation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
