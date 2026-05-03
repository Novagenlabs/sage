// One-off: compute an embedding vector for every active Resource and
// save it to the DB. Re-run when:
//   - You add new resources (use --missing-only, the default)
//   - You change the embedding model (pass --force)
//   - You materially edit blurb/themes/why/bodyText on a resource (pass
//     specific ids, e.g. `npx tsx scripts/embed-resources.ts <id1> <id2>`)
//
// Cost: text-embedding-3-small at $0.02 / 1M tokens.
// 22 resources × ~600 tokens = ~13k tokens = ~$0.0003 for the full catalog.
// Effectively free.
//
// Requires OPENAI_API_KEY in env.

import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  currentEmbeddingModel,
  embedText,
} from "../lib/recommendations/embed-vector";

const prisma = new PrismaClient();

/** What we feed into the embedding model. Same blob every time so a
 *  re-run with the same model produces the same vector. */
function embeddingSourceFor(r: {
  title: string;
  author: string | null;
  blurb: string;
  themes: string[];
  why: string;
  bodyText: string | null;
}): string {
  const lines = [
    r.author ? `${r.title} — ${r.author}` : r.title,
    r.blurb,
    r.themes.length > 0 ? `Themes: ${r.themes.join(", ")}` : "",
    r.why,
    // First ~600 chars of bodyText if present — keeps the most important
    // signal of the actual reading without blowing up token cost.
    r.bodyText ? r.bodyText.slice(0, 600) : "",
  ];
  return lines.filter(Boolean).join("\n\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const force = argv.includes("--force");
  const explicitIds = argv.filter((a) => a !== "--force");

  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "OPENAI_API_KEY missing. Set it in .env, then re-run:\n" +
        "  OPENAI_API_KEY=... npx tsx scripts/embed-resources.ts"
    );
    process.exit(1);
  }

  const where: Prisma.ResourceWhereInput = { isActive: true };
  if (explicitIds.length > 0) {
    where.id = { in: explicitIds };
  } else if (!force) {
    where.embedding = { equals: Prisma.AnyNull };
  }

  const resources = await prisma.resource.findMany({
    where,
    select: {
      id: true,
      title: true,
      author: true,
      blurb: true,
      themes: true,
      why: true,
      bodyText: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (resources.length === 0) {
    console.log(
      explicitIds.length > 0
        ? "No matching resources."
        : "Nothing to do — every active resource already has an embedding. Pass --force to regenerate."
    );
    return;
  }

  const model = currentEmbeddingModel();
  console.log(`Embedding ${resources.length} resource(s) using ${model}...`);

  let ok = 0;
  let fail = 0;
  for (const r of resources) {
    process.stdout.write(`  ${r.id.padEnd(28)} ${r.title.slice(0, 40).padEnd(42)} `);
    try {
      const text = embeddingSourceFor(r);
      const vector = await embedText(text);
      if (!vector) throw new Error("embed returned null");
      await prisma.resource.update({
        where: { id: r.id },
        data: { embedding: vector, embeddingModel: model },
      });
      ok++;
      console.log(`✓ ${vector.length} dims`);
    } catch (err) {
      fail++;
      console.log(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`Done. ${ok} ok, ${fail} failed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
