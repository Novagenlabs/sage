// Bulk-generate Sage-narrated audio for every active Resource that doesn't
// already have an audioUrl. Re-runs are cheap (skips resources that already
// have audio) but you can pass --force to regenerate everything.
//
// Usage:
//   npx tsx scripts/generate-resource-audio.ts          # only missing
//   npx tsx scripts/generate-resource-audio.ts --force  # regenerate all
//   npx tsx scripts/generate-resource-audio.ts <id>...  # specific ids
//
// Cost: ~150 chars per narration × 30 resources = ~4,500 chars. ElevenLabs
// turbo v2.5 is around $0.00017/char on the cheap tier ≈ $0.80 per full
// regeneration. Cheap enough to commit the MP3s.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { generateResourceNarration } from "../lib/recommendations/narrate";

const prisma = new PrismaClient();

async function main() {
  const argv = process.argv.slice(2);
  const force = argv.includes("--force");
  const explicitIds = argv.filter((a) => a !== "--force");

  if (!process.env.ELEVEN_API_KEY) {
    console.error(
      "ELEVEN_API_KEY missing. Set it in .env or pass it inline:\n" +
        "  ELEVEN_API_KEY=... npx tsx scripts/generate-resource-audio.ts"
    );
    process.exit(1);
  }

  const where: Record<string, unknown> = { isActive: true };
  if (explicitIds.length > 0) {
    where.id = { in: explicitIds };
  } else if (!force) {
    where.audioUrl = null;
  }

  const resources = await prisma.resource.findMany({
    where,
    select: {
      id: true,
      title: true,
      author: true,
      blurb: true,
      why: true,
      audioUrl: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (resources.length === 0) {
    console.log(
      explicitIds.length > 0
        ? "No matching resources."
        : "Nothing to do — every active resource already has audio. Pass --force to regenerate."
    );
    return;
  }

  console.log(`Generating ${resources.length} narration${resources.length === 1 ? "" : "s"}...`);

  let ok = 0;
  let fail = 0;
  for (const r of resources) {
    process.stdout.write(`  ${r.id.padEnd(28)} ${r.title.slice(0, 40).padEnd(42)} `);
    try {
      const { publicPath, bytes } = await generateResourceNarration(r);
      await prisma.resource.update({
        where: { id: r.id },
        data: { audioUrl: publicPath },
      });
      ok++;
      console.log(`✓ ${(bytes / 1024).toFixed(1)}KB → ${publicPath}`);
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
