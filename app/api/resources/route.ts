// GET /api/resources — the active resource catalog for the mobile library.
// The web /library page reads Prisma directly (server component); mobile needs
// an HTTP endpoint. Bearer-or-cookie authed via withAuth.

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  const rows = await prisma.resource.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      title: true,
      author: true,
      url: true,
      blurb: true,
      themes: true,
      audioUrl: true,
      bodyText: true,
      bodyKind: true,
      bodySource: true,
    },
  });
  return Response.json(rows);
});
