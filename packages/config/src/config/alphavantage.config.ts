import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";

export interface AlphaVantageConfig {
  readonly apiKey: string | undefined;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly rateLimitPerMinute: number;
}

/** Nested, domain-scoped view of the Alpha Vantage env vars — mirrors
 * `getCoinGeckoConfig()`'s exact shape/pattern. `AlphaVantageRegistrarService`
 * injects the full `Env` via `APP_CONFIG` instead (matching every other
 * provider registrar's precedent); this getter exists for the same
 * reason every other `config/*.config.ts` getter does. */
export function getAlphaVantageConfig(env: Env = loadConfig()): AlphaVantageConfig {
  return {
    apiKey: env.ALPHA_VANTAGE_API_KEY,
    baseUrl: env.ALPHA_VANTAGE_BASE_URL,
    timeoutMs: env.ALPHA_VANTAGE_TIMEOUT,
    rateLimitPerMinute: env.ALPHA_VANTAGE_RATE_LIMIT,
  };
}
