// /library — the resource library, in editorial-reading-room style.
//
// Server Component: queries the Resource catalog directly from Prisma and
// hands it to the client-side <LibraryGrid> island for filter + sheet state.
// No /api/resources endpoint needed.

import { prisma } from "@/lib/prisma";
import { LibraryGrid, type LibraryResource } from "./grid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LibraryPage() {
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
    },
  });

  const resources: LibraryResource[] = rows.map((r) => ({
    id: r.id,
    type: r.type as LibraryResource["type"],
    title: r.title,
    author: r.author,
    url: r.url,
    blurb: r.blurb,
    themes: r.themes,
    audioUrl: r.audioUrl,
  }));

  return <LibraryGrid resources={resources} />;
}
