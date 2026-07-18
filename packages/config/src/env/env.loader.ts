import { validateEnv, type Env } from "./env.validator";

let cached: Env | null = null;

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
  cached = validateEnv(process.env);
  return cached;
}

/** Alias for {@link loadConfig} — same memoized, fail-fast behavior. */
export function getEnv(): Env {
  return loadConfig();
}

/** Clears the memoized config — for tests that need to re-validate after
 * mutating `process.env` between cases. Not needed in application code,
 * which loads config exactly once per process. */
export function resetConfigCache(): void {
  cached = null;
}
