import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/recommendations/admin";
import { generateResourceNarration } from "@/lib/recommendations/narrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/resources/[id]/audio
 *
 * Regenerate (or initially generate) the Sage-narrated audio for one
 * resource. Calls ElevenLabs, writes the MP3 under /public/resource-audio,
 * and updates Resource.audioUrl.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!isAdminEmail(session.user.email)) {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      author: true,
      blurb: true,
      why: true,
    },
  });
  if (!resource) {
    return Response.json({ error: "Resource not found" }, { status: 404 });
  }

  try {
    const { publicPath, bytes } = await generateResourceNarration(resource);
    const updated = await prisma.resource.update({
      where: { id },
      data: { audioUrl: publicPath },
      select: { id: true, audioUrl: true },
    });
    return Response.json({
      ok: true,
      audioUrl: updated.audioUrl,
      bytes,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "narration failed";
    console.error("[admin/audio] generation failed:", err);
    return Response.json({ error: msg }, { status: 502 });
  }
}
