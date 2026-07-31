/**
 * Raw CoinGecko API v3 response shapes — read exclusively by
 * `coingecko.client.ts` (which returns them) and `coingecko.mapper.ts`
 * (which converts them). Nothing outside this directory ever imports
 * these, per MD-002's "convert CoinGecko responses into existing RMSM
 * MarketData model" / this module's standing "never expose provider
 * response objects outside provider" rule (established in MD-001).
 */

/**
 * One entry from `GET /coins/markets` — deliberately used as this
 * provider's primary "current data" source instead of the narrower
 * `/simple/price` endpoint, because it is the ONE CoinGecko call that
 * returns every field MD-002's "Supported Data" section asks for
 * (current price, market cap, 24h volume, 24h change, high, low,
 * circulating supply, total supply) for one or many coins at once —
 * fewer calls against an already rate-limited free tier than fetching
 * `/simple/price` plus a second richer call.
 */
export interface CoinGeckoMarketsEntry {
  id: string;
  symbol: string;
  name: string;
  current_price: number | null;
  market_cap: number | null;
  total_volume: number | null;
  high_24h: number | null;
  low_24h: number | null;
  price_change_percentage_24h: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  last_updated: string | null;
}

/** One entry from `GET /coins/{id}/ohlc` — `[timestamp_ms, open, high, low, close]`, no volume (CoinGecko's OHLC endpoint does not return it — see coingecko.mapper.ts's doc comment on NormalizedCandle.volume). */
export type CoinGeckoOhlcEntry = [number, number, number, number, number];

/** One entry from `GET /search`'s `coins` array. */
export interface CoinGeckoSearchCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
}

export interface CoinGeckoSearchResponse {
  coins?: CoinGeckoSearchCoin[];
}

/**
 * CoinGecko's error body is not perfectly consistent across its own
 * public docs and observed responses — the Demo/Pro API commonly nests
 * `status.error_message`, while some gateway-level failures (e.g. a
 * CDN-level 403/429) return a flatter `{ error: string }` or no JSON body
 * at all. `coingecko.client.ts` defensively checks both shapes rather
 * than assuming one.
 */
export interface CoinGeckoErrorBody {
  error?: string;
  status?: { error_code?: number; error_message?: string };
}
