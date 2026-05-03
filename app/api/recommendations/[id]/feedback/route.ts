import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_FEEDBACK = new Set(["helpful", "not_for_me"]);

/**
 * POST /api/recommendations/[id]/feedback
 *
 * Body: { feedback: "helpful" | "not_for_me" }
 *
 * Sets feedback + feedbackAt on the user's own recommendation. Idempotent —
 * submitting again with a different value just flips it (the user is
 * allowed to change their mind).
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { feedback?: string };
  const feedback = body.feedback;
  if (!feedback || !VALID_FEEDBACK.has(feedback)) {
    return Response.json(
      { error: "feedback must be 'helpful' or 'not_for_me'" },
      { status: 400 }
    );
  }

  const owned = await prisma.recommendation.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) {
    return Response.json(
      { error: "Recommendation not found" },
      { status: 404 }
    );
  }

  const updated = await prisma.recommendation.update({
    where: { id },
    data: { feedback, feedbackAt: new Date() },
    select: { id: true, feedback: true, feedbackAt: true },
  });

  return Response.json({ ok: true, ...updated });
}
