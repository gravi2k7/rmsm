import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { config as loadDotenvFile } from "dotenv";
import { validateEnv, type Env } from "./env.validator";

/**
 * Walks upward from `startDir` looking for `pnpm-workspace.yaml` — the
 * one file that unambiguously marks the monorepo root, regardless of
 * which directory happens to be `process.cwd()` when this runs. That
 * varies by caller: `pnpm --filter @rmsm/api dev` runs with cwd
 * `apps/api`, `vitest run` inside this package runs with cwd
 * `packages/config`, a plain `node dist/main.js` inherits whatever
 * launched it — so resolving the root `.env` path via a fixed relative
 * offset or via `process.cwd()` directly would silently break for at
 * least one of those callers. Walking up from cwd until the workspace
 * marker is found works identically for all of them.
 */
function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null; // reached the filesystem root, no workspace found
    dir = parent;
  }
}

let cached: Env | null = null;
let envFileLoaded = false;

/**
 * Loads the monorepo's root `.env` into `process.env` — exactly once per
 * process. This is the one and only place `.env` is read anywhere in the
 * codebase: no `dotenv` import exists outside this file, no
 * `ConfigModule.forRoot()` exists, and every caller (apps/api today,
 * anything else that depends on `@rmsm/config` in the future) reaches
 * `process.env` exclusively through `loadConfig()`/`getEnv()` below — so
 * putting the load here, immediately before the one call to
 * `validateEnv()`, is what "centralized configuration ownership" means
 * in practice: one loader, one validator, one place either can change.
 *
 * `dotenv.config()`'s default behavior — never overwriting a variable
 * that's already set in `process.env` — is exactly what production
 * needs: a real deployment (Docker/Kubernetes/host env) injects secrets
 * directly into `process.env`, and those must always win over whatever a
 * checked-in `.env` happens to contain. If no root `.env` file exists at
 * all (a legitimate production posture — see `dotenv.config()`'s
 * silently-ignored missing-file case below), this is a no-op and
 * `process.env` is used exactly as the platform provided it.
 */
function loadRootEnvFile(): void {
  if (envFileLoaded) return;

  if (process.env.RMSM_SKIP_DOTENV === "true") {
    envFileLoaded = true;
    return;
  }

  envFileLoaded = true;

  const root = findMonorepoRoot(process.cwd());
  if (!root) return; // no workspace root found — fall back to process.env as-is

  // dotenv.config() itself already no-ops (returns an `error`, doesn't
  // throw) when the target file doesn't exist, so no existsSync guard is
  // needed here — a deployment with no `.env` file is expected to work
  // unmodified, sourcing everything from real process.env instead.
  loadDotenvFile({ path: join(root, ".env") });
}

/**
 * Validates and returns `process.env` against the full merged
 * {@link envSchema}. Fails fast (throws) on boot if required vars are
 * missing/invalid — per the Twelve-Factor principle: never fail silently
 * at runtime.
 *
 * Signature and behavior are unchanged from the original `loadConfig()`
 * this package shipped with — every existing caller across `apps/api`
 * continues to work without modification. New code has two additional
 * options: `getEnv()` (identical to `loadConfig()`, an alias for callers
 * that find the name clearer going forward) and the domain-scoped
 * `config/*.config.ts` getters for a nested, strongly-typed view of the
 * same validated data.
 */
export function loadConfig(): Env {
  if (cached) return cached;
  loadRootEnvFile();
  cached = validateEnv(process.env);
  return cached;
}

/** Alias for {@link loadConfig} — same memoized, fail-fast behavior. */
export function getEnv(): Env {
  return loadConfig();
}

/**
 * Clears the memoized configuration and resets the dotenv-load flag.
 * Intended for tests that modify process.env between test cases.
 * Application code should never call this.
 */
export function resetConfigCache(): void {
  cached = null;
  envFileLoaded = false;
}
