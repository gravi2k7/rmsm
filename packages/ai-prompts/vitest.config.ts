import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // "node" — pure Node/TS domain + application logic, no DOM. Matches
    // packages/shared/vitest.config.ts and apps/web/vitest.config.ts.
    environment: "node",
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
