import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/conversations/context - Get context for new conversation (past summaries + user insights)
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Get recent conversations (last 5 for AI context - not displayed to users)
    const recentConversations = await prisma.conversation.findMany({
      where: {
        userId: session.user.id,
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

    // Get user's consolidated profile summary
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profileSummary: true },
    });

    // Get active conversation if any
    const activeConversation = await prisma.conversation.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50, // Limit messages for context
        },
      },
    });

    return new Response(
      JSON.stringify({
        recentSummaries: recentConversations,
        profileSummary: user?.profileSummary || null,
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
}
