import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3101);
const baseURL = `http://localhost:${PORT}`;

/**
 * Sage v2 E2E config.
 *
 * webServer boots a fresh `next dev` on PORT before tests run. The dev server
 * uses the same Neon DB as local dev — we keep test side-effects to a single
 * dedicated test user (e2e-<random>@sage.test, registered on first sign-up
 * test). External services (OpenRouter, Anam, LiveKit, Paystack) are stubbed
 * via Playwright's `route.fulfill` inside individual specs so we never hit
 * real APIs.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // share one Next dev server + DB user
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "list" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `PORT=${PORT} npm run dev`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
