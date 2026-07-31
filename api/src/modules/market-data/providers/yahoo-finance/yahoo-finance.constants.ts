import type { CandleInterval, AssetClass } from "@rmsm/database";

/**
 * Yahoo's `/v8/finance/chart` endpoint supports far more intervals than
 * this, but MD-004's own Historical Data section names exactly three
 * (Daily/Weekly/Monthly) — this provider only implements what was asked
 * for, matching the "no unnecessary abstractions" rule. Any other
 * `CandleInterval` throws a clear error in `toYahooChartInterval()`
 * (yahoo-finance.client.ts), the same honest-interval-support discipline
 * established for CoinGecko (MD-002) and Alpha Vantage (MD-003).
 */
export const YAHOO_CHART_INTERVAL: Partial<Record<CandleInterval, string>> = {
  ONE_DAY: "1d",
  ONE_WEEK: "1wk",
  ONE_MONTH: "1mo",
};

/**
 * MD-004 positions Yahoo Finance as a supplementary provider for company
 * data, not a general quote source — but `symbolSearchClient.search()`
 * still needs to classify whatever Yahoo's `/v1/finance/search` returns.
 * Yahoo's `quoteType` values are broader than RMSM's `AssetClass` enum;
 * only EQUITY and ETF have a genuine match. Mutual funds
 * (`quoteType: "MUTUALFUND"`) have no corresponding `AssetClass` value —
 * mapped to EQUITY as the closest existing category (see
 * `toAssetClass()` in yahoo-finance.mapper.ts), a known limitation
 * documented in MD004_IMPLEMENTATION_SUMMARY.md rather than silently
 * misclassified without comment.
 */
export const YAHOO_ASSET_CLASSES: AssetClass[] = ["EQUITY", "ETF"];

/**
 * Yahoo Finance publishes no official rate limit (it publishes no
 * official API at all). This is a conservative, self-imposed ceiling —
 * deliberately far below what the unofficial endpoints appear to
 * tolerate in practice — chosen to minimize the chance of the shared
 * cookie/crumb session being flagged and invalidated. MD-004 does not
 * name a dedicated rate-limit env var (only `YAHOO_ENABLED` /
 * `YAHOO_CACHE_TTL` / `YAHOO_TIMEOUT` / `YAHOO_RETRY_COUNT`), so — same
 * precedent as CoinGecko's per-minute figure in MD-002 — this stays a
 * documented constant rather than growing the configuration surface
 * beyond what was actually requested.
 */
export const YAHOO_DEFAULT_REQUESTS_PER_MINUTE = 30;

export const YAHOO_DEFAULT_RETRY_DELAY_MS = 1_000;

/** Every quoteSummary module this provider requests in one call — one round trip covers company profile, quotes-adjacent detail, financials, earnings, and fund metadata, rather than one request per feature. */
export const YAHOO_QUOTE_SUMMARY_MODULES = [
  "assetProfile",
  "summaryDetail",
  "price",
  "defaultKeyStatistics",
  "incomeStatementHistory",
  "balanceSheetHistory",
  "cashflowStatementHistory",
  "calendarEvents",
  "earnings",
  "fundProfile",
].join(",");

/** The symbol Yahoo's own finance.yahoo.com uses as its most-requested quote — cheapest, most reliably-populated real call available, used only by `YahooFinanceHealthProvider`. */
export const YAHOO_HEALTH_CHECK_SYMBOL = "AAPL";

/**
 * "TTL must be configurable" (MD-004's Cache section) — same base-TTL-
 * plus-per-category-multiplier design as Alpha Vantage's cache (MD-003):
 * `YAHOO_CACHE_TTL` (seconds) is the base, multiplied per data category
 * below. Fundamentals-style data (profile, financials, splits) changes
 * on the order of months/quarters, so it is cached far longer than
 * historical bars or the (explicitly non-primary) quote.
 */
export const YAHOO_QUOTE_TTL_MULTIPLIER = 1;
export const YAHOO_HISTORICAL_TTL_MULTIPLIER = 4;
export const YAHOO_PROFILE_TTL_MULTIPLIER = 24;
export const YAHOO_FINANCIALS_TTL_MULTIPLIER = 24;
export const YAHOO_DIVIDENDS_TTL_MULTIPLIER = 12;
export const YAHOO_SPLITS_TTL_MULTIPLIER = 24;
export const YAHOO_EARNINGS_TTL_MULTIPLIER = 4;
export const YAHOO_ETF_METADATA_TTL_MULTIPLIER = 12;
export const YAHOO_NEWS_TTL_MULTIPLIER = 1;

/**
 * `quoteSummary` is fetched as ONE combined payload (see
 * `YAHOO_QUOTE_SUMMARY_MODULES`) and shared by several additive provider
 * methods — company profile, earnings, financial statements, fund
 * metadata, and half of dividend data. Rather than cache the same raw
 * response under the same key at several different TTLs depending on
 * which caller happened to populate it first (incoherent), it is cached
 * once at this single multiplier — the longest of its constituent
 * categories' natural TTLs, since financial-statement/profile data is
 * the least time-sensitive of what this blob contains and over-caching
 * it costs far less than the alternative of re-fetching Yahoo's most
 * fragile, crumb-gated endpoint unnecessarily often.
 */
export const YAHOO_QUOTE_SUMMARY_TTL_MULTIPLIER = 24;
