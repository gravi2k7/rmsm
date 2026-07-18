import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";
import type { AppEnvironment, Environment, FeatureFlags } from "../types/config.types";
import { buildFeatureFlags } from "../utils/config.helper";

export interface AppConfig {
  readonly nodeEnv: Environment;
  readonly appEnv: AppEnvironment;
  readonly ports: {
    readonly api: number;
    readonly web: number;
    readonly admin: number;
  };
  readonly rateLimit: {
    readonly ttlMs: number;
    readonly max: number;
  };
  readonly webAppUrl: string;
  readonly featureFlags: FeatureFlags;
}

/** Builds the nested, strongly-typed `AppConfig` view from an already-
 * validated `Env`. Accepts `env` explicitly (defaulting to `loadConfig()`)
 * so tests can pass a fixture instead of relying on `process.env`. */
export function getAppConfig(env: Env = loadConfig()): AppConfig {
  return {
    nodeEnv: env.NODE_ENV,
    appEnv: env.APP_ENV,
    ports: {
      api: env.API_PORT,
      web: env.WEB_PORT,
      admin: env.ADMIN_PORT,
    },
    rateLimit: {
      ttlMs: env.RATE_LIMIT_TTL_MS,
      max: env.RATE_LIMIT_MAX,
    },
    webAppUrl: env.WEB_APP_URL,
    featureFlags: buildFeatureFlags(env.FEATURE_FLAGS),
  };
}
