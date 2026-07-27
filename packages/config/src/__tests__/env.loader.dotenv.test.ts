import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Covers the root-`.env`-loading behavior added to `loadConfig()`
 * (see env.loader.ts's own doc comments for the full rationale).
 * Deliberately its own file, separate from env.loader.test.ts: the
 * "load the .env file" step is a real singleton (guarded by a
 * module-level `envFileLoaded` flag, on purpose — it must only ever run
 * once per process), so exercising it needs a *fresh* module instance
 * per test via `vi.resetModules()` + dynamic `import()`, rather than
 * sharing the already-loaded module the rest of the suite uses.
 */
describe("loadConfig() root .env loading", () => {
  const originalEnv = { ...process.env };
  let tempRoot: string;

  beforeEach(() => {
    vi.resetModules();
    tempRoot = mkdtempSync(join(tmpdir(), "rmsm-config-test-"));
    writeFileSync(join(tempRoot, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'\n");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.spyOn(process, "cwd").mockRestore();
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("loads values from the workspace root .env into process.env", async () => {
    writeFileSync(
      join(tempRoot, ".env"),
      [
        "DATABASE_URL=postgresql://from-dotenv:pw@localhost:5432/db",
        "REDIS_URL=redis://localhost:6379",
        "JWT_ACCESS_SECRET=" + "a".repeat(16),
        "JWT_REFRESH_SECRET=" + "b".repeat(16),
      ].join("\n"),
    );
    process.env = {};
    vi.spyOn(process, "cwd").mockReturnValue(tempRoot);

    const { loadConfig } = await import("../env/env.loader");
    const config = loadConfig();

    expect(config.DATABASE_URL).toBe("postgresql://from-dotenv:pw@localhost:5432/db");
    expect(process.env.DATABASE_URL).toBe("postgresql://from-dotenv:pw@localhost:5432/db");
  });

  it("never lets a value already in process.env be overwritten by .env (production precedence)", async () => {
    writeFileSync(
      join(tempRoot, ".env"),
      [
        "DATABASE_URL=postgresql://from-dotenv:pw@localhost:5432/db",
        "REDIS_URL=redis://localhost:6379",
        "JWT_ACCESS_SECRET=" + "a".repeat(16),
        "JWT_REFRESH_SECRET=" + "b".repeat(16),
      ].join("\n"),
    );
    process.env = {
      DATABASE_URL: "postgresql://platform-injected:secret@prod-host:5432/prod_db",
      REDIS_URL: "redis://localhost:6379",
      JWT_ACCESS_SECRET: "a".repeat(16),
      JWT_REFRESH_SECRET: "b".repeat(16),
    };
    vi.spyOn(process, "cwd").mockReturnValue(tempRoot);

    const { loadConfig } = await import("../env/env.loader");
    const config = loadConfig();

    expect(config.DATABASE_URL).toBe("postgresql://platform-injected:secret@prod-host:5432/prod_db");
  });

  it("looks up the tree from a nested cwd (e.g. a package directory) to find the workspace root", async () => {
    writeFileSync(
      join(tempRoot, ".env"),
      [
        "DATABASE_URL=postgresql://from-dotenv:pw@localhost:5432/db",
        "REDIS_URL=redis://localhost:6379",
        "JWT_ACCESS_SECRET=" + "a".repeat(16),
        "JWT_REFRESH_SECRET=" + "b".repeat(16),
      ].join("\n"),
    );
    const nestedDir = join(tempRoot, "apps", "api");
    mkdirSync(nestedDir, { recursive: true });
    process.env = {};
    vi.spyOn(process, "cwd").mockReturnValue(nestedDir);

    const { loadConfig } = await import("../env/env.loader");
    const config = loadConfig();

    expect(config.DATABASE_URL).toBe("postgresql://from-dotenv:pw@localhost:5432/db");
  });

  it("is a no-op (falls back to process.env as-is) when no .env file exists at the workspace root", async () => {
    process.env = {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      JWT_ACCESS_SECRET: "a".repeat(16),
      JWT_REFRESH_SECRET: "b".repeat(16),
    };
    vi.spyOn(process, "cwd").mockReturnValue(tempRoot); // has pnpm-workspace.yaml but no .env

    const { loadConfig } = await import("../env/env.loader");
    const config = loadConfig();

    expect(config.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/db");
  });

 it("only reads the .env file once per module instance across repeated loadConfig() calls", async () => {
  writeFileSync(
    join(tempRoot, ".env"),
    [
      "DATABASE_URL=postgresql://from-dotenv:pw@localhost:5432/db",
      "REDIS_URL=redis://localhost:6379",
      "JWT_ACCESS_SECRET=" + "a".repeat(16),
      "JWT_REFRESH_SECRET=" + "b".repeat(16),
    ].join("\n"),
  );

  process.env = {};
  const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempRoot);

  const { loadConfig } = await import("../env/env.loader");

  loadConfig();

  cwdSpy.mockClear();

  // Cached configuration should prevent another .env lookup.
  loadConfig();

  expect(cwdSpy).not.toHaveBeenCalled();
});
});
