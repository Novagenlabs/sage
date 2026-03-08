import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/user/profile - Get current user's profile
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        credits: true,
        createdAt: true,
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(user), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch profile" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// PUT /api/user/profile - Update current user's profile
export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { name } = body;

    // Validate name
    if (name !== undefined && typeof name !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid name" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name?.trim() || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        credits: true,
        createdAt: true,
      },
    });

    return new Response(JSON.stringify(updatedUser), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update profile" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
