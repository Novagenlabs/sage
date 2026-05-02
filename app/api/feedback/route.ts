import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LEN = 5000;

// Send the feedback as an email if Resend is configured. The DB row is
// always written first so nothing is lost on transient email failures.
async function notifyTeam(opts: {
  message: string;
  fromEmail: string | null;
  userEmail: string | null;
  userName: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  const from =
    process.env.FEEDBACK_FROM_EMAIL || "Sage Feedback <onboarding@resend.dev>";
  if (!apiKey || !to) {
    console.log("[feedback] email skipped — RESEND_API_KEY or FEEDBACK_TO_EMAIL unset");
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const subject = `Sage feedback${opts.userName ? ` from ${opts.userName}` : ""}`;
    const replyTo =
      opts.fromEmail || opts.userEmail || undefined;

    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      replyTo,
      text:
        `${opts.message}\n\n---\n` +
        `From: ${opts.userName ?? "anon"} <${opts.userEmail ?? "no account"}>\n` +
        `Reply-to: ${replyTo ?? "(none provided)"}`,
    });

    if (error) {
      console.error("[feedback] resend error:", error);
    }
  } catch (err) {
    console.error("[feedback] resend send failed:", err);
  }
}

/**
 * POST /api/feedback
 * Stores user feedback in the Feedback table and (when Resend is configured)
 * sends it to FEEDBACK_TO_EMAIL. Authentication is optional — if a user is
 * signed in we link the row to their account, otherwise we just keep the
 * message + their email if they provided one.
 */
export async function POST(request: Request) {
  let body: { message?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = body.message?.trim() ?? "";
  const email = body.email?.trim() || null;

  if (!message) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }
  if (message.length > MAX_LEN) {
    return Response.json(
      { error: `Message too long (max ${MAX_LEN} chars)` },
      { status: 400 }
    );
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  // Auth is optional here — capture either way.
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const row = await prisma.feedback.create({
    data: {
      userId,
      email,
      message,
      source: "v2",
    },
    select: { id: true, createdAt: true },
  });

  console.log(
    `[feedback] received id=${row.id} userId=${userId ?? "anon"} chars=${message.length}`
  );

  // Resolve the user's account name + email (if any) for the notification.
  let userName: string | null = null;
  let userEmail: string | null = null;
  if (userId) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    userName = u?.name ?? null;
    userEmail = u?.email ?? null;
  }

  // Fire-and-forget — don't block the response on email delivery.
  notifyTeam({
    message,
    fromEmail: email,
    userEmail,
    userName,
  }).catch((err) => console.error("[feedback] notifyTeam error:", err));

  return Response.json({ ok: true, id: row.id });
}
