import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";

export interface YahooFinanceConfig {
  readonly enabled: boolean;
  readonly cacheTtlSeconds: number;
  readonly timeoutMs: number;
  readonly retryCount: number;
}

/** Nested, domain-scoped view of the Yahoo Finance env vars — mirrors `getAlphaVantageConfig()`'s exact shape/pattern. `YahooFinanceRegistrarService` injects the full `Env` via `APP_CONFIG` instead (matching every other provider registrar's precedent); this getter exists for the same reason every other `config/*.config.ts` getter does. */
export function getYahooFinanceConfig(env: Env = loadConfig()): YahooFinanceConfig {
  return {
    enabled: env.YAHOO_ENABLED,
    cacheTtlSeconds: env.YAHOO_CACHE_TTL,
    timeoutMs: env.YAHOO_TIMEOUT,
    retryCount: env.YAHOO_RETRY_COUNT,
  };
}
