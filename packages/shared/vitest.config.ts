import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // "node", not "jsdom" — this package is pure Node/TS utility logic
    // (JSON helpers, slugs, password rules) with no DOM interaction.
    // jsdom would add real per-test startup overhead for zero benefit
    // here; everything else matches the project's standard vitest config
    // (apps/web/vitest.config.ts) exactly.
    environment: "node",
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
