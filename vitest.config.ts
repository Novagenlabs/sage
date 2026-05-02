import { defineConfig } from "vitest/config";
import path from "node:path";

// Vitest covers Tier 2 (API route + lib unit tests). Playwright covers E2E.
// Keep them separate so they don't collide on the same `vitest` runner files.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    globals: false,
    setupFiles: ["./tests/unit/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
