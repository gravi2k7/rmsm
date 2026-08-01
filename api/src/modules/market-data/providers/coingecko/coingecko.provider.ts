import type { MarketDataProviderType } from "@rmsm/database";
import type { MarketDataProvider } from "../../interfaces/market-data-provider.interface";
import type { ProviderMetadata } from "../../interfaces/provider-metadata.interface";
import type { HistoricalDataClient, HistoricalDataRequest, HistoricalDataResponse } from "../../interfaces/historical-data-client.interface";
import type { QuoteClient } from "../../interfaces/quote-client.interface";
import type { SymbolSearchClient } from "../../interfaces/symbol-search-client.interface";
import type { NormalizedQuote, NormalizedSymbolSearchResult } from "../../interfaces/normalized-market-data.interface";
import { CoinGeckoClient, resolveOhlcDays } from "./coingecko.client";
import { CoinGeckoMapper, type CoinGeckoMarketSnapshot } from "./coingecko.mapper";
import { CoinGeckoErrorMapper } from "./coingecko.error-mapper";
import { CoinGeckoRateLimiter } from "./coingecko.rate-limit";
import { CoinGeckoHealthProvider } from "./coingecko.health";
import { CoinGeckoCacheService } from "./coingecko.cache";
import { resolveCoinGeckoId, COINGECKO_ASSET_CLASSES } from "./coingecko.constants";
import type { CoinGeckoApiError } from "./coingecko.error-mapper";

/**
 * CoinGecko (coingecko.com) — MD-002's crypto-only `MarketDataProvider`,
 * the second real provider this system registers alongside Twelve Data
 * (equities/forex/etc.) and `InternalFeedProvider`. Supports Historical /
 * Quote / Search + Health only, same capability scope as Twelve Data;
 * `tickProvider`/`corporateActionProvider`/`referenceDataProvider`/
 * `instrumentProvider` are left undefined.
 *
 * `getMarketSnapshot()` is an ADDITIVE method beyond the
 * `MarketDataProvider` interface — implementing an interface in
 * TypeScript never forbids a class from having extra members, so this
 * does not change, extend, or violate that interface. It exists because
 * CoinGecko genuinely returns richer data (market cap, 24h volume/
 * change, high/low, supply) than `NormalizedQuote` has fields for; see
 * `coingecko.mapper.ts`'s doc comment on `CoinGeckoMarketSnapshot` for
 * why that data doesn't flow through the standard `quoteClient` path.
 *
 * Not `@Injectable()` — constructed manually by
 * `CoinGeckoRegistrarService`, exactly like `TwelveDataProvider` and
 * `InternalFeedProvider` before it.
 */
export class CoinGeckoProvider implements MarketDataProvider {
  readonly type: MarketDataProviderType = "COINGECKO";
  readonly metadata: ProviderMetadata;

  readonly historicalDataClient: HistoricalDataClient = {
    fetchCandles: async (request: HistoricalDataRequest): Promise<HistoricalDataResponse> => {
      const id = resolveCoinGeckoId(request.providerSymbol);
      const days = resolveOhlcDays(request.interval, request.from, request.to);
      const entries = await this.client.getOhlc(id, days);
      return { candles: this.mapper.toNormalizedCandles(entries, request.providerSymbol, request.interval) };
    },
  };

  readonly quoteClient: QuoteClient = {
    fetchLatestQuote: async (providerSymbol: string): Promise<NormalizedQuote> => {
      const id = resolveCoinGeckoId(providerSymbol);
      const entries = await this.cache.getOrSet(`quote:${id}`, () => this.client.getMarkets([id]));
      const entry = entries.find((e) => e.id === id);
      if (!entry) throw this.unknownSymbolError(providerSymbol, id);
      return this.mapper.toNormalizedQuote(entry);
    },
    fetchLatestQuotes: async (providerSymbols: string[]): Promise<NormalizedQuote[]> => {
      const ids = providerSymbols.map(resolveCoinGeckoId);
      const cacheKey = `quotes:${[...ids].sort().join(",")}`;
      const entries = await this.cache.getOrSet(cacheKey, () => this.client.getMarkets(ids));
      return providerSymbols.map((symbol, index) => {
        // ids = providerSymbols.map(...) just above, so ids.length === providerSymbols.length —
        // ids[index] is always defined here, noUncheckedIndexedAccess just can't see that.
        const id = ids[index]!;
        const entry = entries.find((e) => e.id === id);
        if (!entry) throw this.unknownSymbolError(symbol, id);
        return this.mapper.toNormalizedQuote(entry);
      });
    },
  };

  readonly symbolSearchClient: SymbolSearchClient = {
    search: async (query: string, limit = 10): Promise<NormalizedSymbolSearchResult[]> => {
      const response = await this.client.search(query);
      return this.mapper.toNormalizedSymbolSearchResults(response).slice(0, limit);
    },
  };

  readonly rateLimitPolicy: CoinGeckoRateLimiter;
  readonly errorMapper: CoinGeckoErrorMapper;
  readonly healthProvider: CoinGeckoHealthProvider;

  constructor(
    private readonly client: CoinGeckoClient,
    private readonly mapper: CoinGeckoMapper,
    private readonly cache: CoinGeckoCacheService,
    rateLimiter: CoinGeckoRateLimiter,
    errorMapper: CoinGeckoErrorMapper,
    healthProvider: CoinGeckoHealthProvider,
  ) {
    this.rateLimitPolicy = rateLimiter;
    this.errorMapper = errorMapper;
    this.healthProvider = healthProvider;

    this.metadata = {
      name: "CoinGecko",
      version: "1.0.0",
      marketsSupported: ["GLOBAL"],
      assetClasses: [...COINGECKO_ASSET_CLASSES],
      timeframes: ["THIRTY_MINUTES", "FOUR_HOURS"],
      supportsHistorical: true,
      supportsQuotes: true,
      supportsTicks: false,
      supportsStreaming: false,
      supportsCorporateActions: false,
      rateLimits: { requestsPerMinute: rateLimiter.requestsPerMinute },
      healthStatus: "unknown",
    };
  }

  /**
   * Crypto-only, deliberately always enabled — unlike Twelve Data or
   * Stripe, CoinGecko's public "Demo" API tier works with NO API key at
   * all (only at a lower, shared rate limit), so "no credential" is not
   * a disabled state for this provider the way it is for a credential-
   * gated one. A configured `COINGECKO_API_KEY` raises the effective
   * rate limit; it does not gate availability.
   */
  readonly enabled = true;

  /** See this class's own doc comment — additive, not part of `MarketDataProvider`. */
  async getMarketSnapshot(providerSymbol: string): Promise<CoinGeckoMarketSnapshot> {
    const id = resolveCoinGeckoId(providerSymbol);
    const entries = await this.cache.getOrSet(`snapshot:${id}`, () => this.client.getMarkets([id]));
    const entry = entries.find((e) => e.id === id);
    if (!entry) throw this.unknownSymbolError(providerSymbol, id);
    return this.mapper.toMarketSnapshot(entry);
  }

  private unknownSymbolError(providerSymbol: string, resolvedId: string): CoinGeckoApiError {
    return { isUnknownSymbol: true, message: `No CoinGecko market data for "${providerSymbol}" (resolved id "${resolvedId}").` };
  }
}
