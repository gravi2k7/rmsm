import type { CandleInterval, AssetClass } from "@rmsm/database";

/**
 * Every RMSM CandleInterval this provider supports, mapped to the Alpha
 * Vantage `function` (and, for intraday, `interval` param) that produces
 * it. Alpha Vantage has no native 4-hour intraday interval — its
 * intraday granularities are exactly 1/5/15/30/60 minutes — so
 * FOUR_HOURS is deliberately absent here (see `toAlphaVantageRequest()`
 * in alphavantage.client.ts, which throws a clear, honest error for it
 * rather than approximating a 4h candle by resampling 60min bars, which
 * would silently misrepresent this as first-class provider data instead
 * of a client-side derivation this provider does not perform). This is
 * still the broadest interval coverage of any provider in this module —
 * 7 of RMSM's 9 CandleInterval values, versus Twelve Data's 7 (a
 * different 7) and CoinGecko's 2.
 */
export const ALPHA_VANTAGE_INTERVAL_FUNCTION: Partial<Record<CandleInterval, { fn: string; interval?: string; seriesKey: string }>> = {
  ONE_MINUTE: { fn: "TIME_SERIES_INTRADAY", interval: "1min", seriesKey: "Time Series (1min)" },
  FIVE_MINUTES: { fn: "TIME_SERIES_INTRADAY", interval: "5min", seriesKey: "Time Series (5min)" },
  FIFTEEN_MINUTES: { fn: "TIME_SERIES_INTRADAY", interval: "15min", seriesKey: "Time Series (15min)" },
  THIRTY_MINUTES: { fn: "TIME_SERIES_INTRADAY", interval: "30min", seriesKey: "Time Series (30min)" },
  ONE_HOUR: { fn: "TIME_SERIES_INTRADAY", interval: "60min", seriesKey: "Time Series (60min)" },
  ONE_DAY: { fn: "TIME_SERIES_DAILY", seriesKey: "Time Series (Daily)" },
  ONE_WEEK: { fn: "TIME_SERIES_WEEKLY", seriesKey: "Weekly Time Series" },
  ONE_MONTH: { fn: "TIME_SERIES_MONTHLY", seriesKey: "Monthly Time Series" },
};

/** MD-003's explicit "Supported Assets" list — every asset class Alpha Vantage's REST surface covers through the functions this provider calls (GLOBAL_QUOTE, TIME_SERIES_(INTRADAY/DAILY/WEEKLY/MONTHLY), CURRENCY_EXCHANGE_RATE, SYMBOL_SEARCH). */
export const ALPHA_VANTAGE_ASSET_CLASSES: AssetClass[] = ["EQUITY", "ETF", "FOREX", "CRYPTO"];

/** Alpha Vantage's current documented free-tier ceiling (verified against Alpha Vantage / third-party API-limit references as of this integration): 5 requests/minute AND a separate, much stricter 25 requests/day cap. MD-003 names one configuration key (`ALPHA_VANTAGE_RATE_LIMIT`) — used for the per-minute figure, the more immediately actionable throttle; the daily figure stays a documented constant here (see `AlphaVantageRateLimiter`, which enforces both). */
export const ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_MINUTE = 5;
export const ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY = 25;

export const ALPHA_VANTAGE_DEFAULT_RETRY_COUNT = 3;
export const ALPHA_VANTAGE_DEFAULT_RETRY_DELAY_MS = 1_000;

/** The symbol Alpha Vantage's own documentation uses for its `apikey=demo` examples — the same reasoning as Twelve Data's health probe: the cheapest, most reliably-populated real call available, used only by `AlphaVantageHealthProvider`. */
export const ALPHA_VANTAGE_HEALTH_CHECK_SYMBOL = "IBM";

/**
 * A `providerSymbol` containing "/" (e.g. `"EUR/USD"`, `"BTC/USD"`) is
 * routed to `CURRENCY_EXCHANGE_RATE` (MD-003's "Forex Exchange Rates" /
 * "Crypto Exchange Rates" — the same Alpha Vantage endpoint serves both,
 * distinguished only by which currency codes are passed); everything
 * else is routed to `GLOBAL_QUOTE` as an equity/ETF symbol. This
 * providerSymbol convention is this provider's own — Alpha Vantage's API
 * itself has no unified "quote" concept spanning both.
 */
export function parseCurrencyPair(providerSymbol: string): { fromCurrency: string; toCurrency: string } | null {
  const parts = providerSymbol.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { fromCurrency: parts[0].toUpperCase(), toCurrency: parts[1].toUpperCase() };
}

/**
 * "Use configurable TTL values" (MD-003's Cache section) — no dedicated
 * TTL env var was named in Configuration, so these reuse the single
 * existing Market Data TTL (`MARKET_DATA_CACHE_TTL_MS`, already defined
 * before this task, same reuse this module applied to CoinGecko's
 * cache) as a BASE, with per-category multipliers rather than a second
 * set of new env vars: Company Overview changes on the order of days,
 * not seconds, so caching it at the same TTL as a live quote would be
 * needlessly wasteful of both cache memory and this provider's own
 * scarce daily rate-limit budget. Quotes and exchange rates use the
 * base TTL unmultiplied (1x); historical series (which never change for
 * a closed trading day) and company overview use longer multiples.
 */
export const ALPHA_VANTAGE_QUOTE_TTL_MULTIPLIER = 1;
export const ALPHA_VANTAGE_EXCHANGE_RATE_TTL_MULTIPLIER = 1;
export const ALPHA_VANTAGE_HISTORICAL_TTL_MULTIPLIER = 12;
export const ALPHA_VANTAGE_OVERVIEW_TTL_MULTIPLIER = 60;
