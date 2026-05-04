// Chat-stream load test (REQUIRES LOAD_TEST_MOCK=1 on the server).
// Hits /api/chat with a fake bearer-style auth header — actual auth is
// expected to be bypassed by the server's mock-mode handler, OR you
// authenticate first and reuse the cookie (see the AUTH_COOKIE env var).
//
// What this measures:
//   - Node event-loop pressure with many concurrent SSE streams
//   - Memory growth under sustained streaming
//   - Whether the rate limiter does its job
//
// The mocked SSE response is small (a few hundred bytes) but each
// connection still holds a TCP slot for ~50ms — multiply by 1000 VUs and
// you'll see real concurrency, just no LLM bill.
//
// Run:
//   LOAD_TEST_MOCK=1 npm run dev      # in another tab
//   AUTH_COOKIE='next-auth.session-token=...' k6 run load-test/chat-stream.js
//
// Get the AUTH_COOKIE by signing in in a browser and copying the
// next-auth.session-token cookie value.

import http from "k6/http";
import { check } from "k6";

const BASE = __ENV.BASE || "http://localhost:3100";
const COOKIE = __ENV.AUTH_COOKIE || "";

export const options = {
  scenarios: {
    chat: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 200 },
        { duration: "1m", target: 500 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    "http_req_duration": ["p(95)<3000"],
    "http_req_failed": ["rate<0.05"],
  },
};

const PAYLOAD = JSON.stringify({
  messages: [{ role: "user", content: "I keep going back and forth on this." }],
  modelId: "openai/gpt-4o-mini",
  phase: "exploring",
  sessionStartTime: Date.now(),
});

export default function () {
  const headers = {
    "Content-Type": "application/json",
    ...(COOKIE ? { Cookie: COOKIE } : {}),
  };
  const r = http.post(`${BASE}/api/chat`, PAYLOAD, { headers });
  check(r, {
    "200 or 401": (r) => r.status === 200 || r.status === 401,
    "stream returned": (r) => (r.body?.length ?? 0) > 0,
  });
}
