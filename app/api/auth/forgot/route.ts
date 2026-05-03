import { prisma } from "@/lib/prisma";
import { mintResetToken, sendResetEmail, RESET_TOKEN_TTL_MS } from "@/lib/password-reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot
 *
 * Body: { email: string }
 *
 * Always returns 200 with the same body — even if the email isn't
 * registered. This prevents email-enumeration attacks (a 404 would tell
 * an attacker which addresses have accounts).
 */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  // Best-effort: look the user up. We always return 200 below regardless of
  // whether they exist, but only mint a token + send mail when they do.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  if (user) {
    const { token, hash } = await mintResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    // Invalidate any prior outstanding tokens so a leaked old email can't
    // be replayed after the user requests a new reset.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt },
    });

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const resetUrl = `${siteUrl}/auth/reset-password?token=${token}`;
    await sendResetEmail({
      to: user.email,
      resetUrl,
      userName: user.name,
    });
  }

  return Response.json({
    ok: true,
    // Same message regardless of whether we sent — the UI relies on this.
    message:
      "If that email is registered, we've sent a link to reset your password.",
  });
}
