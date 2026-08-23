import type { MarketDataProviderType, CandleInterval } from "@rmsm/database";
import type { MarketDataProvider } from "../../interfaces/market-data-provider.interface";
import type { ProviderMetadata } from "../../interfaces/provider-metadata.interface";
import type {
  HistoricalDataClient,
  HistoricalDataRequest,
  HistoricalDataResponse,
} from "../../interfaces/historical-data-client.interface";
import type { QuoteClient } from "../../interfaces/quote-client.interface";
import type { SymbolSearchClient } from "../../interfaces/symbol-search-client.interface";
import type {
  NormalizedQuote,
  NormalizedSymbolSearchResult,
} from "../../interfaces/normalized-market-data.interface";
import { BinanceClient } from "./binance.client";
import { BinanceMapper } from "./binance.mapper";
import { BinanceErrorMapper } from "./binance.error-mapper";
import { BinanceRateLimiter } from "./binance.rate-limit";
import { BinanceHealthProvider } from "./binance.health";

const BINANCE_TIMEFRAMES: CandleInterval[] = [
  "ONE_MINUTE",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "THIRTY_MINUTES",
  "ONE_HOUR",
  "FOUR_HOURS",
  "ONE_DAY",
];

export class BinanceProvider implements MarketDataProvider {
  readonly type: MarketDataProviderType = "BINANCE";
  readonly enabled = true;
  readonly metadata: ProviderMetadata;

  readonly historicalDataClient: HistoricalDataClient = {
    fetchCandles: async (
      request: HistoricalDataRequest,
    ): Promise<HistoricalDataResponse> => {
      const entries = await this.client.getKlines({
        symbol: request.providerSymbol,
        interval: request.interval,
        startTime: request.from,
        endTime: request.to,
        limit: 1000,
      });

      return {
        candles: this.mapper.toNormalizedCandles(
          entries,
          request.providerSymbol,
          request.interval,
        ),
      };
    },
  };

  readonly quoteClient: QuoteClient = {
    fetchLatestQuote: async (
      providerSymbol: string,
    ): Promise<NormalizedQuote> => {
      const response =
        await this.client.getTickerPrice(providerSymbol);

      return this.mapper.toNormalizedQuote(
        providerSymbol,
        response.price,
      );
    },

    fetchLatestQuotes: async (
      providerSymbols: string[],
    ): Promise<NormalizedQuote[]> => {
      return Promise.all(
        providerSymbols.map((symbol) =>
          this.quoteClient.fetchLatestQuote(symbol),
        ),
      );
    },
  };

  readonly symbolSearchClient: SymbolSearchClient = {
    search: async (
      query: string,
      limit = 10,
    ): Promise<NormalizedSymbolSearchResult[]> => {
      const response = await this.client.getExchangeInfo();

      return this.mapper
        .toNormalizedSymbolSearchResults(response)
        .filter((item) =>
          item.providerSymbol
            .toUpperCase()
            .includes(query.toUpperCase()),
        )
        .slice(0, limit);
    },
  };

  readonly rateLimitPolicy: BinanceRateLimiter;
  readonly errorMapper: BinanceErrorMapper;
  readonly healthProvider: BinanceHealthProvider;

  constructor(
    private readonly client: BinanceClient,
    private readonly mapper: BinanceMapper,
    rateLimiter: BinanceRateLimiter,
    errorMapper: BinanceErrorMapper,
    healthProvider: BinanceHealthProvider,
  ) {
    this.rateLimitPolicy = rateLimiter;
    this.errorMapper = errorMapper;
    this.healthProvider = healthProvider;

    this.metadata = {
      name: "Binance",
      version: "1.0.0",
      marketsSupported: ["GLOBAL"],
      assetClasses: ["CRYPTO"],
      timeframes: BINANCE_TIMEFRAMES,
      supportsHistorical: true,
      supportsQuotes: true,
      supportsTicks: false,
      supportsStreaming: false,
      supportsCorporateActions: false,
      rateLimits: {
        requestsPerMinute: rateLimiter.requestsPerMinute,
      },
      healthStatus: "unknown",
    };
  }
}
