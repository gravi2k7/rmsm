import type { AssetClass, MarketDataProviderType } from "@rmsm/database";
import type { MarketDataProvider } from "../../interfaces/market-data-provider.interface";
import type { ProviderMetadata } from "../../interfaces/provider-metadata.interface";
import type { HistoricalDataClient, HistoricalDataRequest, HistoricalDataResponse } from "../../interfaces/historical-data-client.interface";
import type { QuoteClient } from "../../interfaces/quote-client.interface";
import type { SymbolSearchClient } from "../../interfaces/symbol-search-client.interface";
import type {
  NormalizedQuote,
  NormalizedSymbolSearchResult,
} from "../../interfaces/normalized-market-data.interface";
import type {
  NormalizedExchangeInfo,
  NormalizedInstrumentReference,
  ReferenceDataProvider,
} from "../../interfaces/reference-data-provider.interface";
import { TwelveDataClient } from "./twelve-data.client";
import { TwelveDataMapper } from "./twelve-data.mapper";
import { TwelveDataErrorMapper } from "./twelve-data.error-mapper";
import { TwelveDataRateLimiter } from "./twelve-data.rate-limit";
import { TwelveDataHealthProvider } from "./twelve-data.health";

const TWELVE_DATA_ASSET_CLASSES: AssetClass[] = ["EQUITY", "ETF", "CRYPTO", "FOREX", "COMMODITY", "INDEX", "BOND", "OPTION", "FUTURE"];
const TWELVE_DATA_TIMEFRAMES = [
  "ONE_MINUTE",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "THIRTY_MINUTES",
  "ONE_HOUR",
  "FOUR_HOURS",
  "ONE_DAY",
] as const;

const TWELVE_DATA_REFERENCE_PAGE_SIZE = 5000;

/**
 * Twelve Data (twelvedata.com) — MD-001's reference production provider
 * implementation, the first real (non-synthetic) `MarketDataProvider`
 * this system registers alongside `InternalFeedProvider`. Supports
 * Historical / Quote / Search + Health only — Tick, CorporateAction,
 * Streaming, Instrument, ReferenceData are left `undefined`, per
 * `MarketDataProvider`'s own doc comment ("every field is optional
 * except metadata... the optional field being present/absent is how a
 * caller gets the actual client"); `metadata.supportsX` mirrors that
 * exactly, so `ProviderRegistry.findByCapability()` and
 * `ProviderResolver` never need to know this is Twelve Data specifically
 * — only that its metadata says what it can do.
 *
 * Constructed exclusively by `TwelveDataRegistrarService`
 * (twelve-data.module.ts) — never instantiated by any service directly,
 * matching `InternalFeedProvider`'s exact precedent (no `@Injectable()`
 * here; this class is a plain, manually-composed object built from
 * already-injected collaborators, not itself resolved through Nest's DI
 * container).
 */
export class TwelveDataProvider implements MarketDataProvider {
  readonly type: MarketDataProviderType = "TWELVE_DATA";
  readonly metadata: ProviderMetadata;

  readonly historicalDataClient: HistoricalDataClient = {
    fetchCandles: async (request: HistoricalDataRequest): Promise<HistoricalDataResponse> => {
      const response = await this.client.getTimeSeries({
        symbol: request.providerSymbol,
        interval: request.interval,
        startDate: request.from,
        endDate: request.to,
      });
      return { candles: this.mapper.toNormalizedCandles(response, request.providerSymbol, request.interval) };
    },
  };

  readonly quoteClient: QuoteClient = {
    fetchLatestQuote: async (providerSymbol: string): Promise<NormalizedQuote> => {
      const response = await this.client.getQuote(providerSymbol);
      return this.mapper.toNormalizedQuote(response);
    },
    fetchLatestQuotes: async (providerSymbols: string[]): Promise<NormalizedQuote[]> => {
      return Promise.all(providerSymbols.map((symbol) => this.quoteClient.fetchLatestQuote(symbol)));
    },
  };

  readonly symbolSearchClient: SymbolSearchClient = {
    search: async (
      query: string,
      limit = 10,
    ): Promise<NormalizedSymbolSearchResult[]> => {
      const response = await this.client.getSymbolSearch(query, limit);

      return this.mapper
        .toNormalizedSymbolSearchResults(response)
        .slice(0, limit);
    },
  };

  readonly referenceDataProvider: ReferenceDataProvider = {
    fetchExchanges: async (): Promise<NormalizedExchangeInfo[]> => {
      const response = await this.client.getExchanges();

      return this.mapper.toNormalizedExchanges(response);
    },

    fetchInstrumentUniverse: async (
      exchangeCode?: string,
    ): Promise<NormalizedInstrumentReference[]> => {
      const [
        stocks,
        etfs,
        forexPairs,
        cryptocurrencies,
        commodities,
      ] = await Promise.all([
        this.fetchAllStocks(),
        this.fetchAllEtfs(),
        this.fetchAllForexPairs(),
        this.fetchAllCryptocurrencies(),
        this.fetchAllCommodities(),
      ]);

      const instruments: NormalizedInstrumentReference[] = [
        ...this.mapper.toNormalizedStocks(stocks),
        ...this.mapper.toNormalizedEtfs(etfs),
        ...this.mapper.toNormalizedForexPairs(forexPairs),
        ...this.mapper.toNormalizedCryptocurrencies(
          cryptocurrencies,
        ),
        ...this.mapper.toNormalizedCommodities(commodities),
      ];

      if (!exchangeCode) {
        return instruments;
      }

      const normalizedExchangeCode = exchangeCode.toUpperCase();

      return instruments.filter(
        (instrument) =>
          instrument.exchangeCode?.toUpperCase() ===
          normalizedExchangeCode,
      );
    },
  };

  readonly rateLimitPolicy: TwelveDataRateLimiter;
  readonly errorMapper: TwelveDataErrorMapper;
  readonly healthProvider: TwelveDataHealthProvider;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly client: TwelveDataClient,
    private readonly mapper: TwelveDataMapper,
    rateLimiter: TwelveDataRateLimiter,
    errorMapper: TwelveDataErrorMapper,
    healthProvider: TwelveDataHealthProvider,
  ) {
    this.rateLimitPolicy = rateLimiter;
    this.errorMapper = errorMapper;
    this.healthProvider = healthProvider;

    // Built here, inside the constructor body, rather than as a class
    // field initializer that reads `rateLimiter` — field initializers
    // and parameter-property assignment ordering is a real footgun to
    // depend on; explicit construction after every constructor
    // parameter is already bound has no such ambiguity.
    this.metadata = {
      name: "Twelve Data",
      version: "1.0.0",
      marketsSupported: ["US", "GLOBAL"],
      assetClasses: TWELVE_DATA_ASSET_CLASSES,
      timeframes: [...TWELVE_DATA_TIMEFRAMES],
      supportsHistorical: true,
      supportsQuotes: true,
      supportsTicks: false,
      supportsStreaming: false,
      supportsCorporateActions: false,
      rateLimits: { requestsPerMinute: rateLimiter.requestsPerMinute },
      healthStatus: "unknown",
    };
  }

  /** Disabled — not broken — when TWELVE_DATA_API_KEY is absent. The
   * exact same "enabled reflects credential presence" convention as
   * `StripeProvider.enabled` (billing/providers/stripe.provider.ts) and
   * Module 002's OAuth provider strategies. */
  private async fetchAllStocks() {
    return this.fetchPaginated(
      (page) =>
        this.client.getStocks(
          page,
          TWELVE_DATA_REFERENCE_PAGE_SIZE,
        ),
    );
  }

  private async fetchAllEtfs() {
    return this.fetchPaginated(
      (page) =>
        this.client.getEtfs(
          page,
          TWELVE_DATA_REFERENCE_PAGE_SIZE,
        ),
    );
  }

  private async fetchAllForexPairs() {
    return this.fetchPaginated(
      (page) =>
        this.client.getForexPairs(
          page,
          TWELVE_DATA_REFERENCE_PAGE_SIZE,
        ),
    );
  }

  private async fetchAllCryptocurrencies() {
    return this.fetchPaginated(
      (page) =>
        this.client.getCryptocurrencies(
          page,
          TWELVE_DATA_REFERENCE_PAGE_SIZE,
        ),
    );
  }

  private async fetchAllCommodities() {
    return this.fetchPaginated(
      (page) =>
        this.client.getCommodities(
          page,
          TWELVE_DATA_REFERENCE_PAGE_SIZE,
        ),
    );
  }

  private async fetchPaginated<T extends { data?: unknown[] }>(
    fetchPage: (page: number) => Promise<T>,
  ): Promise<T> {
    const responses: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetchPage(page);

      responses.push(response);

      const count = response.data?.length ?? 0;

      hasMore = count === TWELVE_DATA_REFERENCE_PAGE_SIZE;

      if (hasMore) {
        page += 1;
      }
    }

    if (responses.length === 1) {
      return responses[0]!;
    }

    return {
      ...responses[0],
      data: responses.flatMap(
        (response) => response.data ?? [],
      ),
    } as T;
  }

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }
}
