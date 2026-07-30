import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },

  esbuild: {
    jsx: "automatic",
  },

  test: {
    environment: "jsdom",
    globals: true,

    setupFiles: [
      "./src/test/setup.ts",
    ],

    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/e2e/**",
    ],

    // Vitest's defaults (5000ms test / 10000ms hook) assume a reasonably
    // fast, lightly-loaded machine. Real runs of this suite have shown
    // "environment"/"setup" phase durations in the multi-second range per
    // file, well beyond what a healthy jsdom + Vitest setup normally takes
    // -- meaning some legitimately-slow (not leaked/stuck) async sequences,
    // like ContactForm's ~10-step fill-out-and-submit test, can trip the
    // default 5s limit purely from machine load, independent of any actual
    // bug. Raised as a safety margin; a genuinely hung test will still fail
    // (just after 15s instead of 5s) rather than passing incorrectly.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});