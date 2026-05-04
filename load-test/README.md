# Load testing

Tools and patterns for stress-testing the Sage stack without melting your
external API budgets or production database.

## Setup

```bash
brew install k6                # macOS
# or: choco install k6 / scoop install k6 / sudo apt install k6
```

## The mock-mode flag

Production never sets it. Local and staging do, when load-testing.

```bash
# In one tab — start the server with mocks on
LOAD_TEST_MOCK=1 npm run dev
```

When `LOAD_TEST_MOCK=1`:

| Real call | Mock behavior |
|-----------|---------------|
| `/api/chat` → OpenRouter | Streams a fixed canned reply (no LLM call) |
| `matchResource()` → OpenRouter / OpenAI | Returns the first catalog id deterministically |
| Embeddings for new sessions | Skipped (mocks return zero vector) |

`isMockMode()` is hardcoded to return `false` when `NODE_ENV=production`,
so even if the env var leaks into prod it's a no-op.

## Tests

| Script | What it tests | Cost-safe? |
|--------|---------------|------------|
| `baseline.js` | Unauth pages — `/`, `/library`, `/onboarding/welcome` | Always |
| `chat-stream.js` | Authenticated chat streams via `/api/chat` | **Only with `LOAD_TEST_MOCK=1`** |

Run a test:

```bash
k6 run load-test/baseline.js
k6 run load-test/chat-stream.js                          # local
BASE=https://staging.example.com k6 run load-test/baseline.js
```

## Reading the output

After a run k6 prints a summary. The numbers that matter:

- **`http_req_duration` p(95) / p(99)** — what the slowest 5% / 1% of
  users experienced. Anything over a couple seconds on a static page is
  a problem; over 5s usually means a backend bottleneck.
- **`http_req_failed` rate** — error rate. Should be 0 on a healthy
  baseline; tiny non-zero rates under high concurrency may be acceptable.
- **`vus`** — concurrent virtual users at peak.
- **`http_reqs` / `iter/s`** — total throughput.
- **Threshold lines (✓/✗)** — pre-set pass/fail bars; the script's
  `thresholds:` block defines what counts as a regression.

## Where to scale

Adjust `stages` in each script's `options` to match the hardware you're
testing against. For a single VPS, 1000 concurrent VUs is a meaningful
ceiling test; for a production-shaped multi-instance fleet, push higher.

## What to look at while a test is running

In another tab:

```bash
# Server log (errors, slow queries, Prisma timeouts)
tail -f /tmp/nextdev.log     # or wherever you started dev

# Process / system stats
top -o cpu                   # macOS — sort by CPU
top -p $(pgrep -d, -f "next dev")
```

Common bottlenecks in order of likely surfacing:

1. **Bcrypt on `/api/auth/callback/credentials`** — login storms peg one
   core per attempt. The middleware caps this route at 5 req/10s per IP.
2. **Prisma pool saturation** — symptoms: requests queue, p95 climbs but
   CPU doesn't. Bump `connection_limit` in the DATABASE_URL or scale Neon.
3. **Single-instance ceiling** — Node fully busy, p95 rising, CPU pinned.
   Time to scale horizontally.

## Production safeguards already in place

- `middleware.ts` rate-limits `/api/*` per IP (uses `cf-connecting-ip`).
- `/api/chat` and `/api/recommendations/stream` get tighter budgets.
- `/api/auth/callback/credentials` is capped at 5/10s to neutralize
  password-attempt and login-storm DoS.
- `/resource-covers/*` and `/resource-audio/*` ship `Cache-Control:
  public, max-age=31536000, immutable` so Cloudflare and the browser
  cache them indefinitely.

## Multi-instance future

The in-memory rate limiter only protects a single instance. When you
scale to >1 dyno/dokploy/container, swap the `Map` in `middleware.ts`
for an Upstash Redis client (~30 lines) and the same logic works
across the fleet.
