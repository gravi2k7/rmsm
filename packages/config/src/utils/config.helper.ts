import type { Env } from "../env/env.validator";
import type { FeatureFlags } from "../types/config.types";

export function isProduction(env: Pick<Env, "NODE_ENV">): boolean {
  return env.NODE_ENV === "production";
}

export function isDevelopment(env: Pick<Env, "NODE_ENV">): boolean {
  return env.NODE_ENV === "development";
}

export function isTest(env: Pick<Env, "NODE_ENV">): boolean {
  return env.NODE_ENV === "test";
}

export function isStaging(env: Pick<Env, "NODE_ENV">): boolean {
  return env.NODE_ENV === "staging";
}

/**
 * Builds the flag map `config/app.config.ts`'s `AppConfig.featureFlags`
 * exposes: every name in `FEATURE_FLAGS` (the comma-separated list) is
 * `true`; every other flag name a caller checks is `false` by default —
 * a flag doesn't need to be pre-declared anywhere to be checked, it's
 * simply off unless explicitly listed.
 */
export function buildFeatureFlags(enabledFlagNames: readonly string[]): FeatureFlags {
  return Object.freeze(Object.fromEntries(enabledFlagNames.map((name) => [name, true])));
}

/** Looks up a single flag, defaulting to `false` for any name not present
 * in the map — the safe default for a flag is always "off". */
export function isFeatureEnabled(flags: FeatureFlags, flagName: string): boolean {
  return flags[flagName] === true;
}
