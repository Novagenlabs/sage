import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/recommendations/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES = new Set([
  "book",
  "article",
  "lecture",
  "podcast",
  "video",
  "audiobook",
]);

interface ResourceInput {
  type?: unknown;
  title?: unknown;
  author?: unknown;
  url?: unknown;
  blurb?: unknown;
  themes?: unknown;
  why?: unknown;
  isActive?: unknown;
}

function validate(input: ResourceInput, partial = false) {
  const errors: string[] = [];
  if (!partial || input.type !== undefined) {
    if (typeof input.type !== "string" || !VALID_TYPES.has(input.type)) {
      errors.push(`type must be one of: ${Array.from(VALID_TYPES).join(", ")}`);
    }
  }
  if (!partial || input.title !== undefined) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      errors.push("title is required");
    }
  }
  if (!partial || input.url !== undefined) {
    if (typeof input.url !== "string" || !input.url.trim()) {
      errors.push("url is required");
    }
  }
  if (!partial || input.blurb !== undefined) {
    if (typeof input.blurb !== "string" || !input.blurb.trim()) {
      errors.push("blurb is required");
    }
  }
  if (!partial || input.why !== undefined) {
    if (typeof input.why !== "string" || !input.why.trim()) {
      errors.push("why is required");
    }
  }
  if (input.themes !== undefined) {
    if (
      !Array.isArray(input.themes) ||
      input.themes.some((t) => typeof t !== "string")
    ) {
      errors.push("themes must be string[]");
    }
  }
  if (input.author !== undefined && input.author !== null && typeof input.author !== "string") {
    errors.push("author must be string or null");
  }
  if (input.isActive !== undefined && typeof input.isActive !== "boolean") {
    errors.push("isActive must be boolean");
  }
  return errors;
}

async function gate() {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false as const, status: 401, error: "Authentication required" };
  }
  if (!isAdminEmail(session.user.email)) {
    return { ok: false as const, status: 403, error: "Admin only" };
  }
  return { ok: true as const };
}

/** GET /api/admin/resources — list all resources (active + inactive). */
export async function GET() {
  const g = await gate();
  if (!g.ok) return Response.json({ error: g.error }, { status: g.status });

  const rows = await prisma.resource.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });
  return Response.json(rows);
}

/** POST /api/admin/resources — create. */
export async function POST(req: Request) {
  const g = await gate();
  if (!g.ok) return Response.json({ error: g.error }, { status: g.status });

  const body = (await req.json().catch(() => ({}))) as ResourceInput;
  const errs = validate(body);
  if (errs.length > 0) {
    return Response.json({ error: errs.join("; ") }, { status: 400 });
  }
  const row = await prisma.resource.create({
    data: {
      type: body.type as string,
      title: (body.title as string).trim(),
      author: typeof body.author === "string" ? body.author.trim() || null : null,
      url: (body.url as string).trim(),
      blurb: (body.blurb as string).trim(),
      themes: (body.themes as string[]) ?? [],
      why: (body.why as string).trim(),
      isActive: body.isActive === undefined ? true : (body.isActive as boolean),
    },
  });
  return Response.json(row, { status: 201 });
}

/** PUT /api/admin/resources?id=… — partial update. */
export async function PUT(req: Request) {
  const g = await gate();
  if (!g.ok) return Response.json({ error: g.error }, { status: g.status });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as ResourceInput;
  const errs = validate(body, true);
  if (errs.length > 0) {
    return Response.json({ error: errs.join("; ") }, { status: 400 });
  }

  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const row = await prisma.resource.update({
    where: { id },
    data: {
      ...(body.type !== undefined && { type: body.type as string }),
      ...(body.title !== undefined && { title: (body.title as string).trim() }),
      ...(body.author !== undefined && {
        author:
          typeof body.author === "string"
            ? body.author.trim() || null
            : null,
      }),
      ...(body.url !== undefined && { url: (body.url as string).trim() }),
      ...(body.blurb !== undefined && {
        blurb: (body.blurb as string).trim(),
      }),
      ...(body.themes !== undefined && { themes: body.themes as string[] }),
      ...(body.why !== undefined && { why: (body.why as string).trim() }),
      ...(body.isActive !== undefined && {
        isActive: body.isActive as boolean,
      }),
    },
  });
  return Response.json(row);
}

/** DELETE /api/admin/resources?id=… — hard delete. */
export async function DELETE(req: Request) {
  const g = await gate();
  if (!g.ok) return Response.json({ error: g.error }, { status: g.status });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.resource.delete({ where: { id } });
  return Response.json({ ok: true });
}
