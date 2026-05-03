import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyResetToken } from "@/lib/password-reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset
 *
 * Body: { token: string, password: string }
 *
 * Validates the token (exists, not expired, not used), updates the user's
 * password hash, marks the token used, and revokes any other still-valid
 * reset tokens for the same user.
 */
export async function POST(req: Request) {
  let body: { token?: string; password?: string };
  try {
    body = (await req.json()) as { token?: string; password?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token;
  const password = body.password;

  if (typeof token !== "string" || token.length < 32) {
    return Response.json({ error: "Invalid token" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 6) {
    return Response.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  // Tokens are stored hashed, so we can't index by token directly. Pull the
  // candidate set (still-valid, unused tokens) and bcrypt-compare each.
  // In practice the candidate set is tiny — at most one per user.
  const candidates = await prisma.passwordResetToken.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true, tokenHash: true },
    take: 200,
  });

  let match: { id: string; userId: string } | null = null;
  for (const c of candidates) {
    if (await verifyResetToken(token, c.tokenHash)) {
      match = { id: c.id, userId: c.userId };
      break;
    }
  }

  if (!match) {
    return Response.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  // Atomically: update password + mark this token used + revoke siblings.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: match.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: match.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        userId: match.userId,
        usedAt: null,
        id: { not: match.id },
      },
      data: { usedAt: new Date() },
    }),
  ]);

  return Response.json({ ok: true });
}
