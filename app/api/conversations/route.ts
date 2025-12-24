import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/conversations - List user's conversations
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        summary: true,
        phase: true,
        isActive: true,
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
}

// POST /api/conversations - Create new conversation
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { title, problemStatement } = body;

    // Mark all other conversations as inactive
    await prisma.conversation.updateMany({
      where: { userId: session.user.id, isActive: true },
      data: { isActive: false },
    });

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
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
}
