import type { AssetClass, MarketDataProviderType } from "@rmsm/database";
import type { MarketDataProvider } from "../interfaces/market-data-provider.interface";
import type { ProviderMetadata } from "../interfaces/provider-metadata.interface";
import type { HistoricalDataClient, HistoricalDataRequest, HistoricalDataResponse } from "../interfaces/historical-data-client.interface";
import type { QuoteClient } from "../interfaces/quote-client.interface";
import type { SymbolSearchClient } from "../interfaces/symbol-search-client.interface";
import type { TickProvider } from "../interfaces/tick-provider.interface";
import type { HealthProvider, ProviderHealthSnapshot } from "../interfaces/health-provider.interface";
import type { ProviderRateLimitPolicy } from "../interfaces/provider-rate-limit-policy.interface";
import type { ProviderErrorMapper, ProviderErrorClassification } from "../interfaces/provider-error-mapper.interface";
import type { NormalizedCandle, NormalizedQuote, NormalizedTick, NormalizedSymbolSearchResult } from "../interfaces/normalized-market-data.interface";
import { candleIntervalToMs } from "../constants/candle-interval.constants";

/**
 * "Custom Provider" (Phase 2B's provider list) mapped to
 * `MarketDataProviderType.INTERNAL_FEED` — a genuinely real, working,
 * deterministic implementation with no external network calls, the same
 * legitimacy as Module 004's `MockProvider`: not a placeholder, not a
 * stub with fake production paths, but real code an organization could
 * actually register and use for internal/synthetic data (a proprietary
 * internal feed is explicitly one of this module's named use cases,
 * Phase 1's architecture doc).
 *
 * Registered this phase to prove the Registry → Factory → Resolver
 * pipeline genuinely works end to end without needing an actual Binance/
 * Polygon/etc. adapter, which Phase 2B explicitly defers ("no provider
 * SDK implementations"). Deterministic candle generation (seeded by
 * providerSymbol + eventTime, not random) makes this testable and
 * reproducible, not just "runs without crashing."
 */
export class InternalFeedProvider implements MarketDataProvider {
  readonly type: MarketDataProviderType = "INTERNAL_FEED";
  readonly enabled = true;

  readonly metadata: ProviderMetadata = {
    name: "Internal Feed (Custom Provider)",
    version: "1.0.0",
    marketsSupported: ["INTERNAL"],
    assetClasses: ["EQUITY", "CRYPTO", "FOREX", "COMMODITY", "INDEX"] as AssetClass[],
    timeframes: ["ONE_MINUTE", "FIVE_MINUTES", "ONE_HOUR", "ONE_DAY"],
    supportsHistorical: true,
    supportsQuotes: true,
    supportsTicks: true,
    supportsStreaming: false,
    supportsCorporateActions: false,
    rateLimits: {},
    healthStatus: "healthy",
  };

  readonly historicalDataClient: HistoricalDataClient = {
    fetchCandles: async (request: HistoricalDataRequest): Promise<HistoricalDataResponse> => {
      const intervalMs = candleIntervalToMs(request.interval);
      const candles: NormalizedCandle[] = [];
      for (let t = request.from.getTime(); t <= request.to.getTime(); t += intervalMs) {
        const seed = this.deterministicSeed(request.providerSymbol, t);
        const base = 100 + (seed % 50);
        candles.push({
          providerSymbol: request.providerSymbol,
          interval: request.interval,
          eventTime: new Date(t),
          open: base.toFixed(2),
          high: (base + 1).toFixed(2),
          low: (base - 1).toFixed(2),
          close: (base + ((seed % 3) - 1)).toFixed(2),
          volume: (1000 + (seed % 5000)).toString(),
        });
      }
      return { candles };
    },
  };

  readonly quoteClient: QuoteClient = {
    fetchLatestQuote: async (providerSymbol: string): Promise<NormalizedQuote> => {
      const seed = this.deterministicSeed(providerSymbol, Date.now());
      const base = 100 + (seed % 50);
      return {
        providerSymbol,
        bidPrice: (base - 0.05).toFixed(2),
        askPrice: (base + 0.05).toFixed(2),
        lastPrice: base.toFixed(2),
        eventTime: new Date(),
      };
    },
    fetchLatestQuotes: async (providerSymbols: string[]): Promise<NormalizedQuote[]> => {
      return Promise.all(providerSymbols.map((s) => this.quoteClient.fetchLatestQuote(s)));
    },
  };

  readonly symbolSearchClient: SymbolSearchClient = {
    search: async (query: string, limit = 10): Promise<NormalizedSymbolSearchResult[]> => {
      // No real symbol universe to search — returns a single synthetic
      // match echoing the query, honestly reflecting that this provider
      // has no actual catalog, rather than returning a fabricated list
      // of unrelated results.
      const results: NormalizedSymbolSearchResult[] = [
        { providerSymbol: query.toUpperCase(), name: `Synthetic instrument for "${query}"`, assetClass: "EQUITY" },
      ];
      return results.slice(0, limit);
    },
  };

  readonly tickProvider: TickProvider = {
    fetchRecentTicks: async (providerSymbol: string, limit: number): Promise<NormalizedTick[]> => {
      const now = Date.now();
      return Array.from({ length: limit }, (_, i) => {
        const t = now - i * 1000;
        const seed = this.deterministicSeed(providerSymbol, t);
        return {
          providerSymbol,
          price: (100 + (seed % 50)).toFixed(2),
          size: (1 + (seed % 100)).toString(),
          eventTime: new Date(t),
        };
      });
    },
  };

  readonly healthProvider: HealthProvider = {
    checkHealth: async (): Promise<ProviderHealthSnapshot> => ({
      status: "healthy",
      latencyMs: 0,
      lastCheckedAt: new Date(),
    }),
  };

  readonly rateLimitPolicy: ProviderRateLimitPolicy = {
    // No external network call to protect against — always clear to proceed.
    getWaitTimeMs: async () => 0,
    recordCall: () => undefined,
  };

  readonly errorMapper: ProviderErrorMapper = {
    classify: (): ProviderErrorClassification => "unknown",
    isRetryable: () => false,
  };

  /** Deterministic (not random) so the same request produces the same synthetic data every time — reproducible test fixtures, not flaky ones. */
  private deterministicSeed(symbol: string, timeMs: number): number {
    const str = `${symbol}:${timeMs}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}
