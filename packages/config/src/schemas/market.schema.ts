import { z } from "zod";
import { durationMs } from "../env/env.parser";

/**
 * Market Data (AI-101) operational settings.
 *
 * Honest gap: AI-101's actual provider credentials/configuration
 * (per-provider API keys, rate limits, which providers are active) live
 * in the database via `MarketDataProviderConfig` /
 * `market-data-provider-config.repository.ts` — genuinely per-organization,
 * runtime-editable data, not environment-level config, so none of that
 * belongs in this schema. What *does* belong here is the operational,
 * deploy-time tuning that's the same across an entire environment
 * regardless of which providers are configured: sync cadence, cache
 * lifetime, and request timeout/concurrency ceilings.
 *
 * No code in `apps/api` reads these values yet — same "declare ahead of
 * first consumer" pattern already used for the OTEL vars in
 * `logging.schema.ts`. Wiring `provider-orchestration.service.ts` to
 * actually read these instead of whatever internal constants it uses
 * today is real, separate follow-up work, not done as part of this
 * config-package upgrade (which explicitly must not modify any package
 * outside `@rmsm/config`).
 */
export const marketSchema = z.object({
  MARKET_DATA_SYNC_INTERVAL_MS: durationMs(60_000),
  MARKET_DATA_CACHE_TTL_MS: durationMs(5_000),
  MARKET_DATA_REQUEST_TIMEOUT_MS: durationMs(10_000),
  MARKET_DATA_MAX_CONCURRENT_REQUESTS: z.coerce.number().int().positive().default(10),
});

export type MarketEnv = z.infer<typeof marketSchema>;
