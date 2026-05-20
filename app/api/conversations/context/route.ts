import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/conversations/context - Get context for new conversation (past summaries + user insights)
export const GET = withAuth(async (_request, authUser) => {
  try {
    // Get recent conversations (last 5 for AI context - not displayed to users)
    const recentConversations = await prisma.conversation.findMany({
      where: {
        userId: authUser.id,
        summary: { not: null }, // Only include summarized conversations
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        summary: true,
        updatedAt: true,
      },
      take: 5,
    });

    // Get user's consolidated profile summary and name
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { profileSummary: true, name: true },
    });

    // Get active conversation envelope only — transcripts are not stored,
    // so resume relies on the client's localStorage. We just return id +
    // title so the client can re-bind to the right conversation row.
    const activeConversation = await prisma.conversation.findFirst({
      where: {
        userId: authUser.id,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        phase: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new Response(
      JSON.stringify({
        recentSummaries: recentConversations,
        profileSummary: user?.profileSummary || null,
        userName: user?.name || null,
        activeConversation,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching context:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch context" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
