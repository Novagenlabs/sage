// One-off: try to download a real cover image for every active Resource
// and drop it into /public/resource-covers/<id>.jpg, where the existing
// <ResourceCover> component already picks it up automatically.
//
// Strategy per resource:
//   1. YouTube URL → use img.youtube.com/vi/<id>/maxresdefault.jpg (fallback
//      hqdefault.jpg). No HTML parsing needed.
//   2. Anything else → fetch the page HTML, parse the first og:image /
//      twitter:image / link rel="image_src" we find, download that.
//   3. If a file already exists for that id at any extension, skip
//      (unless --force). Pass specific ids to scrape just those.
//
// Output is intentionally written as `.jpg` regardless of source format —
// the cover component falls back through webp/jpg/png so this is fine.
//
// Examples:
//   npx tsx scripts/scrape-resource-covers.ts            # only missing ones
//   npx tsx scripts/scrape-resource-covers.ts --force    # re-scrape all
//   npx tsx scripts/scrape-resource-covers.ts cmopfm...  # one specific id

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const COVERS_DIR = join(process.cwd(), "public", "resource-covers");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Safari/605.1.15";

interface ScrapeResult {
  id: string;
  title: string;
  status: "ok" | "skipped" | "no-image" | "error";
  source?: string;
  imageUrl?: string;
  bytes?: number;
  message?: string;
}

function youtubeIdFrom(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const shortMatch = u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{6,})/);
      if (shortMatch) return shortMatch[1];
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (id) return id;
    }
  } catch {
    // not a URL we can parse
  }
  return null;
}

function extractMetaImage(html: string, baseUrl: string): string | null {
  // Prefer og:image, then twitter:image, then link rel="image_src".
  const patterns: RegExp[] = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
    /<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) {
      const raw = m[1].trim();
      try {
        return new URL(raw, baseUrl).toString();
      } catch {
        return raw;
      }
    }
  }
  return null;
}

async function downloadImage(url: string): Promise<Buffer | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/*,*/*;q=0.8" },
    redirect: "follow",
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  // Sanity check — anything under 2 KB is probably a 1x1 tracking pixel
  // or a tiny logo; skip so we keep the procedural fallback instead.
  if (buf.length < 2048) return null;
  return buf;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function resolveImageForResource(url: string): Promise<{
  imageUrl: string;
  source: string;
} | null> {
  // 1. YouTube — derive directly.
  const ytId = youtubeIdFrom(url);
  if (ytId) {
    return {
      imageUrl: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
      source: "youtube",
    };
  }
  // 2. Generic — parse og:image off the page HTML.
  const html = await fetchHtml(url);
  if (!html) return null;
  const og = extractMetaImage(html, url);
  if (!og) return null;
  return { imageUrl: og, source: "og:image" };
}

async function existingCoverFor(id: string): Promise<string | null> {
  try {
    const files = await readdir(COVERS_DIR);
    const hit = files.find((f) =>
      f.toLowerCase().match(new RegExp(`^${id}\\.(webp|jpg|jpeg|png)$`, "i"))
    );
    return hit ?? null;
  } catch {
    return null;
  }
}

async function processOne(
  r: { id: string; title: string; url: string },
  force: boolean
): Promise<ScrapeResult> {
  const existing = await existingCoverFor(r.id);
  if (existing && !force) {
    return {
      id: r.id,
      title: r.title,
      status: "skipped",
      message: `already has ${existing}`,
    };
  }

  const resolved = await resolveImageForResource(r.url);
  if (!resolved) {
    return { id: r.id, title: r.title, status: "no-image" };
  }

  let buf = await downloadImage(resolved.imageUrl);
  // For YouTube, fall back to hqdefault if maxres 404s or returns the
  // grey placeholder (which is < 2KB).
  if (!buf && resolved.source === "youtube") {
    const fallbackUrl = resolved.imageUrl.replace(
      "maxresdefault",
      "hqdefault"
    );
    buf = await downloadImage(fallbackUrl);
    if (buf) resolved.imageUrl = fallbackUrl;
  }
  if (!buf) {
    return {
      id: r.id,
      title: r.title,
      status: "no-image",
      imageUrl: resolved.imageUrl,
      source: resolved.source,
      message: "image fetch failed or too small",
    };
  }

  const outPath = join(COVERS_DIR, `${r.id}.jpg`);
  await writeFile(outPath, buf);
  return {
    id: r.id,
    title: r.title,
    status: "ok",
    source: resolved.source,
    imageUrl: resolved.imageUrl,
    bytes: buf.length,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const force = argv.includes("--force");
  const explicitIds = argv.filter((a) => !a.startsWith("--"));

  if (!existsSync(COVERS_DIR)) {
    await mkdir(COVERS_DIR, { recursive: true });
  }

  const resources = await prisma.resource.findMany({
    where: {
      isActive: true,
      ...(explicitIds.length > 0 ? { id: { in: explicitIds } } : {}),
    },
    select: { id: true, title: true, url: true },
    orderBy: { createdAt: "asc" },
  });

  if (resources.length === 0) {
    console.log("No matching resources.");
    return;
  }

  console.log(
    `Scraping covers for ${resources.length} resource(s)${force ? " (force)" : ""}...`
  );

  const results: ScrapeResult[] = [];
  for (const r of resources) {
    process.stdout.write(
      `  ${r.id.padEnd(28)} ${r.title.slice(0, 38).padEnd(40)} `
    );
    try {
      const result = await processOne(r, force);
      results.push(result);
      switch (result.status) {
        case "ok":
          console.log(
            `✓ ${result.source} (${Math.round((result.bytes ?? 0) / 1024)}kb)`
          );
          break;
        case "skipped":
          console.log(`· skipped (${result.message})`);
          break;
        case "no-image":
          console.log(`✗ no usable image${result.message ? ` (${result.message})` : ""}`);
          break;
        case "error":
          console.log(`✗ ${result.message}`);
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        id: r.id,
        title: r.title,
        status: "error",
        message,
      });
      console.log(`✗ ${message}`);
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const missing = results.filter(
    (r) => r.status === "no-image" || r.status === "error"
  );
  console.log(
    `\nDone. ${ok} downloaded, ${skipped} already-had-cover, ${missing.length} no-image.`
  );
  if (missing.length > 0) {
    console.log("\nNo cover for:");
    for (const m of missing) {
      console.log(`  ${m.id}  ${m.title}  — ${m.message ?? m.status}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
