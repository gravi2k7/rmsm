import type { MarketDataProviderType } from "@rmsm/database";
import type { MarketDataProvider } from "../../interfaces/market-data-provider.interface";
import type { ProviderMetadata } from "../../interfaces/provider-metadata.interface";
import type { HistoricalDataClient, HistoricalDataRequest, HistoricalDataResponse } from "../../interfaces/historical-data-client.interface";
import type { QuoteClient } from "../../interfaces/quote-client.interface";
import type { SymbolSearchClient } from "../../interfaces/symbol-search-client.interface";
import type { NormalizedQuote, NormalizedSymbolSearchResult } from "../../interfaces/normalized-market-data.interface";
import { AlphaVantageClient, toAlphaVantageRequest } from "./alphavantage.client";
import { AlphaVantageMapper, type AlphaVantageCompanyOverview } from "./alphavantage.mapper";
import { AlphaVantageErrorMapper } from "./alphavantage.error-mapper";
import { AlphaVantageRateLimiter } from "./alphavantage.rate-limit";
import { AlphaVantageHealthProvider } from "./alphavantage.health";
import { AlphaVantageCacheService } from "./alphavantage.cache";
import type { AlphaVantageApiError } from "./alphavantage.error-mapper";
import type { AlphaVantageMarketStatusEntry, AlphaVantageGlobalQuote } from "./alphavantage.types";
import {
  ALPHA_VANTAGE_ASSET_CLASSES,
  ALPHA_VANTAGE_INTERVAL_FUNCTION,
  parseCurrencyPair,
  ALPHA_VANTAGE_QUOTE_TTL_MULTIPLIER,
  ALPHA_VANTAGE_EXCHANGE_RATE_TTL_MULTIPLIER,
  ALPHA_VANTAGE_HISTORICAL_TTL_MULTIPLIER,
  ALPHA_VANTAGE_OVERVIEW_TTL_MULTIPLIER,
} from "./alphavantage.constants";

/**
 * Alpha Vantage (alphavantage.co) — MD-003's third real
 * `MarketDataProvider`, alongside Twelve Data and CoinGecko. Broadest
 * asset-class coverage of any provider in this module (US/global
 * equities, ETFs, forex, crypto — MD-003's explicit "Supported Assets")
 * and the broadest interval coverage (7 of RMSM's 9 `CandleInterval`
 * values; only `FOUR_HOURS` and — same as every provider here — the
 * calendar-relative intervals beyond what a fixed function/interval pair
 * can express are unsupported, and `fetchCandles()` says so rather than
 * approximating).
 *
 * `getCompanyOverview()` and `getMarketStatus()` are additive methods
 * beyond `MarketDataProvider` — same pattern as `CoinGeckoProvider.
 * getMarketSnapshot()` (MD-002): real data this provider genuinely
 * supports, with no field on `NormalizedQuote` to carry it, reachable
 * without changing any existing interface.
 *
 * Not `@Injectable()` — constructed manually by
 * `AlphaVantageRegistrarService`, matching every provider class in this
 * module since `InternalFeedProvider`.
 */
export class AlphaVantageProvider implements MarketDataProvider {
  readonly type: MarketDataProviderType = "ALPHA_VANTAGE";
  readonly metadata: ProviderMetadata;

  readonly historicalDataClient: HistoricalDataClient = {
    fetchCandles: async (request: HistoricalDataRequest): Promise<HistoricalDataResponse> => {
      const resolved = toAlphaVantageRequest(request.interval);
      const cacheKey = `historical:${request.providerSymbol}:${request.interval}`;
      const response = await this.cache.getOrSet(cacheKey, this.historicalTtlMs(), () =>
        this.client.getTimeSeries(request.providerSymbol, request.interval),
      );
      const series = (response as unknown as Record<string, unknown>)[resolved.seriesKey] as
        | Record<string, { "1. open": string; "2. high": string; "3. low": string; "4. close": string; "5. volume": string }>
        | undefined;
      if (!series) return { candles: [] };
      return { candles: this.mapper.toNormalizedCandles(series, request.providerSymbol, request.interval) };
    },
  };

  readonly quoteClient: QuoteClient = {
    fetchLatestQuote: async (providerSymbol: string): Promise<NormalizedQuote> => {
      const pair = parseCurrencyPair(providerSymbol);
      if (pair) {
        const cacheKey = `rate:${pair.fromCurrency}:${pair.toCurrency}`;
        const response = await this.cache.getOrSet(cacheKey, this.exchangeRateTtlMs(), () =>
          this.client.getExchangeRate(pair.fromCurrency, pair.toCurrency),
        );
        const rate = response["Realtime Currency Exchange Rate"];
        if (!rate) throw this.emptyResultError(providerSymbol);
        return this.mapper.toNormalizedQuoteFromExchangeRate(rate);
      }

      const cacheKey = `quote:${providerSymbol}`;
      const response = await this.cache.getOrSet(cacheKey, this.quoteTtlMs(), () => this.client.getGlobalQuote(providerSymbol));
      const quote = response["Global Quote"];
      if (!quote || Object.keys(quote).length === 0) throw this.emptyResultError(providerSymbol);
      // Narrowed by the length check above — Alpha Vantage's own response
      // type only ever has an empty object OR every field populated, never
      // a partial shape, so this cast reflects a real invariant rather than
      // suppressing a genuine type hole.
      return this.mapper.toNormalizedQuote(quote as AlphaVantageGlobalQuote);
    },
    /** Alpha Vantage has no multi-symbol GLOBAL_QUOTE (unlike CoinGecko's `/coins/markets`) — fans out to `fetchLatestQuote` per symbol, same as `TwelveDataProvider`. Each call independently respects the shared rate limiter/cache, so a batch of N symbols costs N rate-limit credits, not 1 — a real cost this provider's severe 25/day free-tier cap makes worth calling out here explicitly. */
    fetchLatestQuotes: async (providerSymbols: string[]): Promise<NormalizedQuote[]> => {
      return Promise.all(providerSymbols.map((symbol) => this.quoteClient.fetchLatestQuote(symbol)));
    },
  };

  readonly symbolSearchClient: SymbolSearchClient = {
    search: async (query: string, limit = 10): Promise<NormalizedSymbolSearchResult[]> => {
      const response = await this.client.search(query);
      return this.mapper.toNormalizedSymbolSearchResults(response.bestMatches ?? []).slice(0, limit);
    },
  };

  readonly rateLimitPolicy: AlphaVantageRateLimiter;
  readonly errorMapper: AlphaVantageErrorMapper;
  readonly healthProvider: AlphaVantageHealthProvider;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly client: AlphaVantageClient,
    private readonly mapper: AlphaVantageMapper,
    private readonly cache: AlphaVantageCacheService,
    private readonly baseCacheTtlMs: number,
    rateLimiter: AlphaVantageRateLimiter,
    errorMapper: AlphaVantageErrorMapper,
    healthProvider: AlphaVantageHealthProvider,
  ) {
    this.rateLimitPolicy = rateLimiter;
    this.errorMapper = errorMapper;
    this.healthProvider = healthProvider;

    this.metadata = {
      name: "Alpha Vantage",
      version: "1.0.0",
      marketsSupported: ["US", "GLOBAL"],
      assetClasses: [...ALPHA_VANTAGE_ASSET_CLASSES],
      timeframes: Object.keys(ALPHA_VANTAGE_INTERVAL_FUNCTION) as ProviderMetadata["timeframes"],
      supportsHistorical: true,
      supportsQuotes: true,
      supportsTicks: false,
      supportsStreaming: false,
      supportsCorporateActions: false,
      rateLimits: { requestsPerMinute: rateLimiter.requestsPerMinute, requestsPerDay: rateLimiter.requestsPerDay },
      healthStatus: "unknown",
    };
  }

  /** Disabled — not broken — when `ALPHA_VANTAGE_API_KEY` is absent, same convention as `TwelveDataProvider`/`StripeProvider`. Unlike CoinGecko, Alpha Vantage's `apikey=demo` fallback only serves a handful of fixed demo symbols (IBM, etc.), not real production use, so "no key" is treated as genuinely disabled here rather than "available at a lower limit." */
  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  /** See this class's own doc comment — additive, not part of `MarketDataProvider`. */
  async getCompanyOverview(providerSymbol: string): Promise<AlphaVantageCompanyOverview> {
    const cacheKey = `overview:${providerSymbol}`;
    const response = await this.cache.getOrSet(cacheKey, this.overviewTtlMs(), () => this.client.getOverview(providerSymbol));
    if (!response.Symbol) throw this.emptyResultError(providerSymbol);
    return this.mapper.toCompanyOverview(response);
  }

  /** See this class's own doc comment — additive, not part of `MarketDataProvider`. MD-003 lists Market Status as "when available"; genuinely available on Alpha Vantage's free tier via `MARKET_STATUS`, so implemented rather than stubbed. */
  async getMarketStatus(): Promise<AlphaVantageMarketStatusEntry[]> {
    const response = await this.cache.getOrSet("market-status", this.quoteTtlMs(), () => this.client.getMarketStatus());
    return this.mapper.toMarketStatusEntries(response.markets ?? []);
  }

  private quoteTtlMs(): number {
    return this.baseCacheTtlMs * ALPHA_VANTAGE_QUOTE_TTL_MULTIPLIER;
  }

  private exchangeRateTtlMs(): number {
    return this.baseCacheTtlMs * ALPHA_VANTAGE_EXCHANGE_RATE_TTL_MULTIPLIER;
  }

  private historicalTtlMs(): number {
    return this.baseCacheTtlMs * ALPHA_VANTAGE_HISTORICAL_TTL_MULTIPLIER;
  }

  private overviewTtlMs(): number {
    return this.baseCacheTtlMs * ALPHA_VANTAGE_OVERVIEW_TTL_MULTIPLIER;
  }

  private emptyResultError(providerSymbol: string): AlphaVantageApiError {
    return { isEmptyResult: true, message: `No Alpha Vantage data for "${providerSymbol}".` };
  }
}
