/**
 * MD-002's explicit "Supported Assets — Examples" list, mapped to the
 * CoinGecko coin `id` each ticker resolves to (CoinGecko's REST API is
 * id-keyed, not ticker-keyed — `BTC` is not a valid `/coins/{id}/...`
 * path segment, `bitcoin` is). `resolveCoinGeckoId()` in
 * coingecko.client.ts checks this table first (case-insensitive); a
 * `providerSymbol` not present here is passed through unchanged on the
 * assumption it is already a valid CoinGecko id — this table is a
 * convenience for the 7 documented examples, not an allowlist, since a
 * real deployment will resolve far more than 7 assets through this
 * provider.
 */
export const COINGECKO_SYMBOL_TO_ID: Readonly<Record<string, string>> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  ADA: "cardano",
};

/**
 * CoinGecko's documented Demo/public-tier rate limit is "~30 calls per
 * minute" and explicitly varies with traffic (per CoinGecko's own Common
 * Errors & Rate Limit docs) — this is a conservative fallback used only
 * when no `MarketDataProviderConfig.rateLimitPerMinute` override is
 * supplied (see `CoinGeckoRegistrarService.buildProvider()` in
 * coingecko.module.ts). An organization on a paid CoinGecko plan should
 * set that override rather than rely on this default.
 */
export const COINGECKO_DEFAULT_REQUESTS_PER_MINUTE = 30;

/** Not environment-configurable — MD-002's Configuration section names
 * only COINGECKO_BASE_URL/COINGECKO_API_KEY (unlike Twelve Data's 5
 * env vars), so these stay as documented constants rather than growing
 * @rmsm/config beyond what was actually requested. */
export const COINGECKO_DEFAULT_TIMEOUT_MS = 10_000;
export const COINGECKO_DEFAULT_RETRY_COUNT = 3;
export const COINGECKO_DEFAULT_RETRY_DELAY_MS = 500;

/** This provider is crypto-only (MD-002's explicit scope) — `metadata.assetClasses` on `CoinGeckoProvider` is exactly this one value, never the broader multi-asset-class list Twelve Data exposes. */
export const COINGECKO_ASSET_CLASSES = ["CRYPTO"] as const;

/**
 * Resolves a `providerSymbol` into a CoinGecko coin `id`. Checks
 * `COINGECKO_SYMBOL_TO_ID` first (case-insensitive — MD-002's 7
 * examples), and otherwise assumes the input is already a valid
 * CoinGecko id and lower-cases it (CoinGecko ids are always lowercase,
 * e.g. "bitcoin", "usd-coin") rather than rejecting anything outside the
 * 7-entry example table — a real deployment resolves far more than 7
 * assets through this provider, and CoinGecko itself is the ultimate
 * authority on whether a given id is valid (an unknown id surfaces as
 * `symbol_not_found` from the client/error-mapper, not a client-side
 * throw here).
 */
export function resolveCoinGeckoId(providerSymbol: string): string {
  const upper = providerSymbol.toUpperCase();
  return COINGECKO_SYMBOL_TO_ID[upper] ?? providerSymbol.toLowerCase();
}
