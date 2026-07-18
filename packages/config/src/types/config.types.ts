/**
 * Cross-cutting types shared by every domain schema/config in this
 * package. Domain-specific types (e.g. `AppConfig`, `DatabaseConfig`)
 * live next to their own schema/config pair instead, so that a change to
 * one domain's shape doesn't require touching this file.
 */

/** The four environments this platform deploys to — matches `NODE_ENV`'s
 * own enum exactly, named here so other packages/apps can reference the
 * type without importing a Zod schema just to get a union type. */
export type Environment = "development" | "test" | "staging" | "production";

/** A second, finer-grained dimension `APP_ENV` tracks alongside
 * `NODE_ENV` — e.g. distinguishing a developer's own local machine from a
 * shared "development" deployment, both of which are `NODE_ENV=development`. */
export type AppEnvironment = "local" | "development" | "staging" | "production";

/**
 * Feature flags: a flat map of flag name to enabled/disabled. Populated
 * from the `FEATURE_FLAGS` env var (a comma-separated list of enabled
 * flag names — see `env/env.parser.ts`'s `parseFeatureFlagList`) merged
 * with any flags that have their own dedicated env var (e.g.
 * `STRATEGY_OUTBOX_PUBLISHER_ENABLED`), so callers have exactly one place
 * to check a flag regardless of which mechanism enabled it.
 */
export type FeatureFlags = Readonly<Record<string, boolean>>;

/** Thrown by `env.validator.ts` when environment validation fails — carries
 * the Zod issues in a pre-formatted, human-readable form so a fail-fast
 * boot error is immediately actionable rather than a raw Zod error dump. */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: readonly string[],
  ) {
    super(message);
    this.name = "ConfigValidationError";
  }
}
