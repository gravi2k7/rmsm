import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";

export interface TwelveDataConfig {
  readonly apiKey: string | undefined;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly retryCount: number;
  readonly retryDelayMs: number;
}

/**
 * Nested, domain-scoped view of the Twelve Data env vars — mirrors
 * `getMarketConfig()`'s exact shape/pattern. Most call sites
 * (`TwelveDataRegistrarService`) inject the full `Env` object via
 * `APP_CONFIG` instead, matching `StripeProvider`'s established
 * precedent; this getter exists for the same reason every other
 * `config/*.config.ts` getter does — a typed, non-flat, single-domain
 * view for a caller that only cares about this provider's settings.
 */
export function getTwelveDataConfig(env: Env = loadConfig()): TwelveDataConfig {
  return {
    apiKey: env.TWELVE_DATA_API_KEY,
    baseUrl: env.TWELVE_DATA_BASE_URL,
    timeoutMs: env.TWELVE_DATA_TIMEOUT,
    retryCount: env.TWELVE_DATA_RETRY_COUNT,
    retryDelayMs: env.TWELVE_DATA_RETRY_DELAY,
  };
}
