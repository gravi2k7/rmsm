import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";

export interface MarketConfig {
  readonly syncIntervalMs: number;
  readonly cacheTtlMs: number;
  readonly requestTimeoutMs: number;
  readonly maxConcurrentRequests: number;
}

/** See `schemas/market.schema.ts` for the honest note on scope: this
 * covers deploy-time operational tuning only. Per-provider credentials
 * and which providers are active are database-stored, per-organization
 * data, not environment config, so they have no representation here. */
export function getMarketConfig(env: Env = loadConfig()): MarketConfig {
  return {
    syncIntervalMs: env.MARKET_DATA_SYNC_INTERVAL_MS,
    cacheTtlMs: env.MARKET_DATA_CACHE_TTL_MS,
    requestTimeoutMs: env.MARKET_DATA_REQUEST_TIMEOUT_MS,
    maxConcurrentRequests: env.MARKET_DATA_MAX_CONCURRENT_REQUESTS,
  };
}
