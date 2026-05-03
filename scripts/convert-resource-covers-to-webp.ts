// One-off: convert every PNG/JPG cover in /public/resource-covers/ to WebP.
// The <ResourceCover> component already prefers webp first in its
// extension cascade, so once a webp lands the original PNG/JPG can go.
//
// Defaults:
//   - quality 85 (visually indistinguishable from source on dark UI;
//     typical ~70-85% size reduction vs PNG, ~30-50% vs JPG)
//   - resizes anything wider than 1280px down to 1280 (covers render at
//     ≤640 CSS px even on retina; a 1280 source is plenty)
//   - keeps the original file unless --delete is passed
//
// Usage:
//   npx tsx scripts/convert-resource-covers-to-webp.ts
//   npx tsx scripts/convert-resource-covers-to-webp.ts --delete

import { readdir, stat, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const COVERS_DIR = join(process.cwd(), "public", "resource-covers");
const MAX_WIDTH = 1280;
const QUALITY = 85;

async function main() {
  const argv = process.argv.slice(2);
  const deleteOriginals = argv.includes("--delete");

  if (!existsSync(COVERS_DIR)) {
    console.error(`No directory at ${COVERS_DIR}`);
    process.exit(1);
  }

  const files = await readdir(COVERS_DIR);
  const candidates = files.filter((f) => /\.(png|jpe?g)$/i.test(f));

  if (candidates.length === 0) {
    console.log("No PNG/JPG covers to convert.");
    return;
  }

  console.log(
    `Converting ${candidates.length} cover(s) to webp${deleteOriginals ? " (and deleting originals)" : ""}...`
  );

  let totalSrc = 0;
  let totalOut = 0;
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of candidates) {
    const srcPath = join(COVERS_DIR, filename);
    const id = filename.replace(/\.(png|jpe?g)$/i, "");
    const outPath = join(COVERS_DIR, `${id}.webp`);
    process.stdout.write(`  ${filename.padEnd(42)} `);

    if (existsSync(outPath)) {
      console.log("· webp already exists, skipping (delete it first to redo)");
      skipped++;
      continue;
    }

    try {
      const srcStat = await stat(srcPath);
      const meta = await sharp(srcPath).metadata();
      const needsResize = (meta.width ?? 0) > MAX_WIDTH;

      const pipeline = sharp(srcPath);
      if (needsResize) {
        pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
      }
      await pipeline.webp({ quality: QUALITY, effort: 5 }).toFile(outPath);

      const outStat = await stat(outPath);
      totalSrc += srcStat.size;
      totalOut += outStat.size;
      const pct = Math.round(
        ((srcStat.size - outStat.size) / srcStat.size) * 100
      );
      console.log(
        `→ ${(outStat.size / 1024).toFixed(0).padStart(4)}kb (was ${(srcStat.size / 1024).toFixed(0).padStart(4)}kb, -${pct}%)${
          needsResize ? ` resized→${MAX_WIDTH}` : ""
        }`
      );

      if (deleteOriginals) {
        await unlink(srcPath);
      }
      ok++;
    } catch (err) {
      failed++;
      console.log(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (ok > 0) {
    const totalPct = Math.round(((totalSrc - totalOut) / totalSrc) * 100);
    console.log(
      `\nDone. ${ok} converted, ${skipped} already-webp, ${failed} failed. Total: ${(
        totalSrc / 1_000_000
      ).toFixed(1)}MB → ${(totalOut / 1_000_000).toFixed(1)}MB (-${totalPct}%).`
    );
    if (!deleteOriginals) {
      console.log(
        `\nThe original PNG/JPG files are still on disk. Re-run with --delete to remove them once you've verified the webps look correct.`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
