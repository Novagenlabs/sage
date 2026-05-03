// Password-reset helpers. Token shape:
//   - 32 random bytes hex-encoded (64 chars) — the token the user gets in
//     the email and types into the reset URL.
//   - We store ONLY a bcrypt hash of the token in DB. A leak of the table
//     does not give an attacker the token.
//   - Tokens are single-use (usedAt) and expire after 1 hour.

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const RESET_BCRYPT_ROUNDS = 10;

/** Generate a fresh hex token (returned to user) + its bcrypt hash (stored). */
export async function mintResetToken(): Promise<{
  token: string;
  hash: string;
}> {
  const token = randomBytes(32).toString("hex");
  const hash = await bcrypt.hash(token, RESET_BCRYPT_ROUNDS);
  return { token, hash };
}

export async function verifyResetToken(
  token: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

/**
 * Send the reset email via Resend. No-op when the email infrastructure
 * isn't configured (so dev environments without a Resend key still work
 * — the token gets logged to the server console instead).
 */
export async function sendResetEmail(opts: {
  to: string;
  resetUrl: string;
  userName?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.FEEDBACK_FROM_EMAIL ||
    "Sage <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(
      `[password-reset] RESEND_API_KEY unset — would have sent reset to ${opts.to}: ${opts.resetUrl}`
    );
    return { sent: false, reason: "no_api_key" };
  }

  try {
    const resend = new Resend(apiKey);
    const greeting = opts.userName ? `Hi ${opts.userName},` : "Hi there,";
    const text =
      `${greeting}\n\n` +
      `You asked to reset your Sage password. Open this link within the next hour to choose a new one:\n\n` +
      `${opts.resetUrl}\n\n` +
      `If you didn't ask for this, you can safely ignore this email — your password won't change.\n\n` +
      `— Sage`;
    const { error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: "Reset your Sage password",
      text,
    });
    if (error) {
      console.error("[password-reset] resend error:", error);
      return { sent: false, reason: "resend_error" };
    }
    return { sent: true };
  } catch (err) {
    console.error("[password-reset] send failed:", err);
    return { sent: false, reason: "exception" };
  }
}
