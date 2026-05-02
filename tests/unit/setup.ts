// Shared test setup for Vitest unit + API tests.
//
// Keeps env vars deterministic and silences noisy console output coming
// from the route handlers under test (they log freely).
import { vi, beforeEach } from "vitest";

// NODE_ENV is read-only — vitest sets it to "test" anyway.
process.env.OPENROUTER_API_KEY = "test-openrouter";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
