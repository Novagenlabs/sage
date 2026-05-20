import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/conversations - List user's conversations
export const GET = withAuth(async (_request, authUser) => {
  try {
    // Only return conversations that have a generated summary. Empty/active
    // sessions (mid-conversation or failed-to-summarise) are noise in the
    // entries list and don't have anything useful to render.
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: authUser.id,
        summary: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        summary: true,
        phase: true,
        isActive: true,
        color: true,
        moods: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
      take: 50, // Limit to recent 50 conversations
    });

    return new Response(JSON.stringify(conversations), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch conversations" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// POST /api/conversations - Create new conversation
export const POST = withAuth(async (request, authUser) => {
  try {
    const body = await request.json();
    const { title, problemStatement } = body;

    // Mark all other conversations as inactive
    await prisma.conversation.updateMany({
      where: { userId: authUser.id, isActive: true },
      data: { isActive: false },
    });

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId: authUser.id,
        title: title || problemStatement?.slice(0, 100) || "New conversation",
        isActive: true,
      },
    });

    return new Response(JSON.stringify(conversation), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create conversation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
