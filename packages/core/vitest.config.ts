import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // "node", not "jsdom" — this package is pure domain-kernel TypeScript
    // (entities, value objects, results, guards) with no DOM interaction,
    // same rationale as packages/shared/vitest.config.ts.
    environment: "node",
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
