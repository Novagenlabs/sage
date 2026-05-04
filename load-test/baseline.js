// Baseline load test — unauth surface.
// Hits the public pages a logged-out visitor sees: home, library, the
// onboarding entry. No external API calls, no DB writes. The point is to
// measure the raw Next.js + Node ceiling on this box, separate from any
// third-party rate limit.
//
// Run:
//   k6 run load-test/baseline.js
//   BASE=https://staging.example.com k6 run load-test/baseline.js
//
// Reading the output:
//   - http_req_duration p(95): how slow the slowest 5% of requests are
//   - http_req_failed rate: should be 0 — anything non-zero is a real bug
//   - vus: how many concurrent virtual users at each moment
//
// Defaults push to 1000 concurrent over ~6 minutes. Scale stages.target
// down if you're testing a small box.

import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE || "http://localhost:3100";

export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 200 },
        { duration: "1m", target: 500 },
        { duration: "2m", target: 1000 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    "http_req_failed": ["rate<0.01"],
    "http_req_duration{path:home}": ["p(95)<2000"],
    "http_req_duration{path:library}": ["p(95)<2500"],
  },
};

const ROUTES = [
  { path: "/", tag: "home" },
  { path: "/library", tag: "library" },
  { path: "/onboarding/welcome", tag: "onboarding" },
];

export default function () {
  // Each VU picks a route uniformly at random — closer to real traffic
  // than hammering one URL.
  const route = ROUTES[Math.floor(Math.random() * ROUTES.length)];
  const r = http.get(`${BASE}${route.path}`, {
    tags: { path: route.tag },
  });
  check(r, {
    "status 200": (r) => r.status === 200,
    "served HTML": (r) => r.headers["Content-Type"]?.includes("html") ?? false,
  });
  // Modest think-time so VUs don't spam at literally infinite RPS.
  sleep(Math.random() * 1.5);
}
