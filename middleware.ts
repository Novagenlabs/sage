import { NextResponse, type NextRequest } from "next/server";

// Two responsibilities:
//
// 1. Backwards-compat: any old /v2/* link (bookmarks, shared URLs, push
//    notifications minted before the rename) gets a 308 redirect to the
//    new path at the root.
// 2. Per-IP rate limiting on API routes — first line of defense against
//    abuse, scrapers, and accidental client loops. In-memory token bucket;
//    survives a single instance fine. For multi-instance deployments this
//    needs to move to Redis (Upstash is the smallest lift).
//
// Static assets, page routes (handled by Next's edge cache + Cloudflare
// upstream), and auth callbacks are not rate-limited — only /api/* is.

const WINDOW_MS = 10_000; // 10s rolling window
const MAX_REQUESTS_PER_IP = Number(process.env.RATE_LIMIT_MAX ?? 60);

// Different limits per route family so cheap reads aren't governed by the
// same budget as expensive writes / streams.
const ROUTE_BUDGETS: Array<{ test: RegExp; max: number }> = [
  { test: /^\/api\/chat(\/|$)/, max: 8 },                   // streaming, expensive
  { test: /^\/api\/recommendations\/stream(\/|$)/, max: 6 },// streaming, expensive
  { test: /^\/api\/auth\/callback\/credentials(\/|$)/, max: 5 }, // bcrypt
  { test: /^\/api\//, max: MAX_REQUESTS_PER_IP },           // everything else
];

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

// Lightweight LRU eviction so memory is bounded even under abuse where
// every request comes from a fresh IP.
const MAX_BUCKETS = 50_000;
function evictIfNeeded() {
  if (buckets.size <= MAX_BUCKETS) return;
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
    if (buckets.size <= MAX_BUCKETS * 0.8) return;
  }
}

function clientIp(req: NextRequest): string {
  // Cloudflare sets cf-connecting-ip; standard proxies set x-forwarded-for.
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function budgetFor(pathname: string): number {
  for (const b of ROUTE_BUDGETS) {
    if (b.test.test(pathname)) return b.max;
  }
  return MAX_REQUESTS_PER_IP;
}

function rateLimit(req: NextRequest): NextResponse | null {
  const pathname = req.nextUrl.pathname;
  if (!pathname.startsWith("/api/")) return null;

  const ip = clientIp(req);
  const max = budgetFor(pathname);
  const key = `${ip}:${pathname}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
    evictIfNeeded();
  }
  bucket.count++;

  if (bucket.count > max) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return new NextResponse(
      JSON.stringify({ error: "rate limit exceeded", retryAfter }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(bucket.resetAt / 1000)),
        },
      }
    );
  }

  // Attach informational headers; route handlers can ignore.
  const remaining = Math.max(0, max - bucket.count);
  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(max));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  res.headers.set("X-RateLimit-Reset", String(Math.floor(bucket.resetAt / 1000)));
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // /v2/* legacy redirect.
  if (pathname === "/v2" || pathname.startsWith("/v2/")) {
    const stripped = pathname.replace(/^\/v2(\/|$)/, "/");
    const url = req.nextUrl.clone();
    url.pathname = stripped === "" ? "/" : stripped;
    url.search = search;
    return NextResponse.redirect(url, 308);
  }

  // Rate limit /api/*.
  const rl = rateLimit(req);
  if (rl) return rl;

  return NextResponse.next();
}

export const config = {
  // Match /v2 + every API route. Page routes are intentionally exempt —
  // those are cached upstream (Next + Cloudflare) and rate-limiting them
  // would just penalize legitimate browsing.
  matcher: ["/v2", "/v2/:path*", "/api/:path*"],
};
