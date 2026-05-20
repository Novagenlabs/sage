import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signMobileToken, verifyMobileToken } from "@/lib/mobile-auth";

export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json();
    if (!refreshToken) {
      return NextResponse.json(
        { error: "refreshToken is required" },
        { status: 400 }
      );
    }

    const payload = await verifyMobileToken(refreshToken);
    if (!payload || payload.type !== "refresh") {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, image: true, credits: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const nextPayload = { sub: user.id, email: user.email, name: user.name };
    const [token, newRefresh] = await Promise.all([
      signMobileToken(nextPayload, "access"),
      signMobileToken(nextPayload, "refresh"),
    ]);

    return NextResponse.json({
      token,
      refreshToken: newRefresh,
      user,
    });
  } catch (error) {
    console.error("[mobile/refresh] error", error);
    return NextResponse.json(
      { error: "Failed to refresh" },
      { status: 500 }
    );
  }
}
