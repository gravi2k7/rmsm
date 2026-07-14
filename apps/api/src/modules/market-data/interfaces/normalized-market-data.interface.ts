import type { AssetClass, CandleInterval, MarketDataSource } from "@rmsm/database";

/**
 * The provider-agnostic shapes every provider adapter (Phase 2+) must
 * normalize raw payloads INTO before anything else in this system ever
 * sees them — the quality requirement "no untyped external-provider
 * payloads" means every provider's own response shape is confined to
 * that provider's adapter file and never leaks past it. Every other
 * contract in this module (HistoricalDataClient, QuoteClient, etc.)
 * speaks in these types, never a provider's raw JSON shape.
 */

export interface NormalizedCandle {
  /** The provider's own symbol string, BEFORE InstrumentAlias resolution — resolving this to a canonical instrumentId is a service-layer concern (Phase 2+), not this contract's. */
  providerSymbol: string;
  interval: CandleInterval;
  eventTime: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  sourceTimestamp?: Date;
}

export interface NormalizedQuote {
  providerSymbol: string;
  bidPrice?: string;
  askPrice?: string;
  lastPrice?: string;
  bidSize?: string;
  askSize?: string;
  eventTime: Date;
  sourceTimestamp?: Date;
}

export interface NormalizedTick {
  providerSymbol: string;
  price: string;
  size: string;
  eventTime: Date;
  sourceTimestamp?: Date;
}

export interface NormalizedSymbolSearchResult {
  providerSymbol: string;
  name: string;
  assetClass: AssetClass;
  exchangeCode?: string;
  currency?: string;
}

/** Every normalized payload carries which MarketDataSource it represents — set by the client that produced it (HistoricalDataClient always LIVE|DELAYED|HISTORICAL_IMPORT|BACKFILL depending on what was requested), not guessed downstream. */
export interface WithSource {
  source: MarketDataSource;
}
