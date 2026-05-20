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
    // Note: as of the summary-only persistence change, transcripts are not
    // returned on read. Only the conversation envelope, summary, and
    // distilled insights leave the server.
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: authUser.id,
      },
      include: {
        insights: {
          orderBy: { createdAt: "desc" },
        },
        // Most recent recommendation tied to this session, joined to the
        // resource so the entry-detail page can render the same card the
        // user saw post-session (or a still-pending one if they skipped it).
        recommendations: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            resource: {
              select: {
                id: true,
                type: true,
                title: true,
                author: true,
                url: true,
                blurb: true,
                audioUrl: true,
                bodyText: true,
                bodyKind: true,
                bodySource: true,
              },
            },
          },
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
    const { title, phase, summary, isActive, color, moods } = body as {
      title?: unknown;
      phase?: unknown;
      summary?: unknown;
      isActive?: unknown;
      color?: unknown;
      moods?: unknown;
    };

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

    // Validate moods is a string array if provided.
    if (
      moods !== undefined &&
      (!Array.isArray(moods) || moods.some((m) => typeof m !== "string"))
    ) {
      return Response.json(
        { error: "moods must be string[]" },
        { status: 400 }
      );
    }
    if (color !== undefined && color !== null && typeof color !== "string") {
      return Response.json({ error: "color must be a string" }, { status: 400 });
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title as string | null }),
        ...(phase !== undefined && { phase: phase as string }),
        ...(summary !== undefined && { summary: summary as string | null }),
        ...(isActive !== undefined && { isActive: isActive as boolean }),
        ...(color !== undefined && { color: color as string | null }),
        ...(moods !== undefined && { moods: (moods as string[]).slice(0, 20) }),
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
