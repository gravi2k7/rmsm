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
  },
});