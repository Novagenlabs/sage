import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/user/profile - Get current user's profile
export const GET = withAuth(async (_request, authUser) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
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
});

// PUT /api/user/profile - Update current user's profile
export const PUT = withAuth(async (request, authUser) => {
  try {
    const body = await request.json();
    const { name, birthday, preferredTopics, passcode } = body as {
      name?: unknown;
      birthday?: unknown;
      preferredTopics?: unknown;
      // 4-digit string. Pass empty string to clear the lock.
      passcode?: unknown;
    };

    // Build the update payload incrementally so unknown fields don't
    // accidentally overwrite existing values.
    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string") {
        return Response.json({ error: "Invalid name" }, { status: 400 });
      }
      data.name = name.trim() || null;
    }

    if (birthday !== undefined) {
      if (birthday === null || birthday === "") {
        data.birthday = null;
      } else if (typeof birthday === "string") {
        const d = new Date(birthday);
        if (Number.isNaN(d.getTime())) {
          return Response.json({ error: "Invalid birthday" }, { status: 400 });
        }
        data.birthday = d;
      } else {
        return Response.json({ error: "Invalid birthday" }, { status: 400 });
      }
    }

    if (preferredTopics !== undefined) {
      if (
        !Array.isArray(preferredTopics) ||
        preferredTopics.some((t) => typeof t !== "string")
      ) {
        return Response.json(
          { error: "preferredTopics must be string[]" },
          { status: 400 }
        );
      }
      data.preferredTopics = (preferredTopics as string[]).slice(0, 20);
    }

    if (passcode !== undefined) {
      if (typeof passcode !== "string") {
        return Response.json({ error: "Invalid passcode" }, { status: 400 });
      }
      if (passcode === "") {
        data.passcodeHash = null;
      } else if (!/^\d{4,6}$/.test(passcode)) {
        return Response.json(
          { error: "Passcode must be 4-6 digits" },
          { status: 400 }
        );
      } else {
        data.passcodeHash = await bcrypt.hash(passcode, 10);
      }
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        credits: true,
        birthday: true,
        preferredTopics: true,
        createdAt: true,
      },
    });

    return Response.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return Response.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
});
