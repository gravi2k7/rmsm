import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // This monorepo intentionally runs two React major versions side by
      // side (apps/web on 18, apps/admin on 19 per Phase 4B's own spec).
      // Without a forced alias here, Vitest's own module resolution can
      // pick up a *different* react/react-dom copy than the one
      // @testing-library/react and lucide-react's own compiled output
      // were resolved against in this app's build, producing "A React
      // Element from an older version of React was rendered" — pinning
      // both to apps/admin's own local copies removes the ambiguity.
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
