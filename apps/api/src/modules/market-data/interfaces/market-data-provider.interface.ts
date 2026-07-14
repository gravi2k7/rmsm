import type { MarketDataProviderType } from "@rmsm/database";
import type { HistoricalDataClient } from "./historical-data-client.interface";
import type { QuoteClient } from "./quote-client.interface";
import type { SymbolSearchClient } from "./symbol-search-client.interface";
import type { ProviderRateLimitPolicy } from "./provider-rate-limit-policy.interface";
import type { ProviderErrorMapper } from "./provider-error-mapper.interface";

/**
 * The composite contract a Phase 2 provider adapter implements — one
 * class per MarketDataProviderType (Binance, Polygon, Twelve Data,
 * Alpha Vantage, Yahoo Finance, TradingView bridge, broker bridges,
 * internal feeds — the prompt's named future adapters), each providing
 * whichever of the three client capabilities it actually supports (not
 * every provider offers all three — e.g. a pure historical-data provider
 * might have no QuoteClient). Mirrors the EP-004/EP-005 provider-adapter
 * shape (adapter interface + registry + factory, no vendor SDK
 * dependency) — the fourth application of that same proven pattern in
 * this project, not a new architecture invented for this module.
 */
export interface MarketDataProvider {
  readonly type: MarketDataProviderType;
  readonly enabled: boolean;
  readonly historicalDataClient?: HistoricalDataClient;
  readonly quoteClient?: QuoteClient;
  readonly symbolSearchClient?: SymbolSearchClient;
  readonly rateLimitPolicy: ProviderRateLimitPolicy;
  readonly errorMapper: ProviderErrorMapper;
}

/** Constructs a MarketDataProvider instance from a MarketDataProviderConfig row's non-secret configuration plus a resolved credential (fetched via credentialReference from wherever secrets actually live — Phase 2's concern, not this contract's). */
export interface MarketDataProviderFactory {
  create(config: { type: MarketDataProviderType; baseUrl?: string; resolvedCredential?: unknown }): MarketDataProvider;
}

/** Looks up the right MarketDataProvider for a given type — the read side; MarketDataProviderFactory is the construction side, same registry+factory split as EP-005's ProviderFactory/ProviderRegistry pair. */
export interface ProviderRegistry {
  get(type: MarketDataProviderType): MarketDataProvider;
  listEnabled(): MarketDataProviderType[];
}
