import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/recommendations/[id]/click
 *
 * Records that the user opened the resource URL. Best-effort — the card
 * fires this in the background and immediately opens the link in a new
 * tab regardless of the response. Sets clickedAt only on the first click;
 * subsequent calls are no-ops.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const owned = await prisma.recommendation.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, clickedAt: true },
  });
  if (!owned) {
    return Response.json(
      { error: "Recommendation not found" },
      { status: 404 }
    );
  }

  if (owned.clickedAt) {
    return Response.json({ ok: true, alreadyRecorded: true });
  }

  await prisma.recommendation.update({
    where: { id },
    data: { clickedAt: new Date() },
  });

  return Response.json({ ok: true });
}
