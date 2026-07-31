import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";

export interface CoinGeckoConfig {
  readonly apiKey: string | undefined;
  readonly baseUrl: string;
}

/** Nested, domain-scoped view of the CoinGecko env vars — mirrors
 * `getTwelveDataConfig()`'s exact shape/pattern. `CoinGeckoRegistrarService`
 * injects the full `Env` via `APP_CONFIG` instead (matching
 * `TwelveDataRegistrarService`'s precedent); this getter exists for the
 * same reason every other `config/*.config.ts` getter does. */
export function getCoinGeckoConfig(env: Env = loadConfig()): CoinGeckoConfig {
  return {
    apiKey: env.COINGECKO_API_KEY,
    baseUrl: env.COINGECKO_BASE_URL,
  };
}
