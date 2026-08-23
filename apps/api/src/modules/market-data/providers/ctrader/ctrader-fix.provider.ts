import type { AssetClass, MarketDataProviderType } from "@rmsm/database";

import type { MarketDataProvider } from "../../interfaces/market-data-provider.interface";
import type { ProviderMetadata } from "../../interfaces/provider-metadata.interface";
import type { QuoteClient } from "../../interfaces/quote-client.interface";
import type { NormalizedQuote } from "../../interfaces/normalized-market-data.interface";

import { CTraderFixClient } from "./ctrader-fix.client";
import { CTraderFixErrorMapper } from "./ctrader-fix.error-mapper";
import { CTraderFixHealthProvider } from "./ctrader-fix.health";
import { CTraderFixRateLimiter } from "./ctrader-fix.rate-limit";

const CTRADER_ASSET_CLASSES: AssetClass[] = [
  "FOREX",
];

const CTRADER_TIMEFRAMES = [
  "ONE_MINUTE",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "THIRTY_MINUTES",
  "ONE_HOUR",
  "FOUR_HOURS",
  "ONE_DAY",
] as const;

/**
 * cTrader FIX Price Connection provider.
 *
 * This adapter is intentionally limited to live quote/streaming
 * functionality. The separate cTrader Trade Connection is not part
 * of this provider.
 *
 * The underlying FIX client maintains a persistent connection and
 * receives server-pushed market-data snapshots. QuoteClient therefore
 * reads the latest normalized quote cached by that client.
 */
export class CTraderFixProvider implements MarketDataProvider {
  readonly type: MarketDataProviderType = "CTRADER";
  readonly metadata: ProviderMetadata;

  readonly quoteClient: QuoteClient = {
    fetchLatestQuote: async (
      providerSymbol: string,
    ): Promise<NormalizedQuote> => {
      const quote = this.client.getLatestQuote(providerSymbol);

      if (!quote) {
        throw new Error(
          `cTrader FIX quote is not available for provider symbol ${providerSymbol}`,
        );
      }

      return quote;
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

  readonly rateLimitPolicy: CTraderFixRateLimiter;
  readonly errorMapper: CTraderFixErrorMapper;
  readonly healthProvider: CTraderFixHealthProvider;

  constructor(
    private readonly client: CTraderFixClient,
    rateLimiter: CTraderFixRateLimiter,
    errorMapper: CTraderFixErrorMapper,
    healthProvider: CTraderFixHealthProvider,
    private readonly configured = true,
  ) {
    this.rateLimitPolicy = rateLimiter;
    this.errorMapper = errorMapper;
    this.healthProvider = healthProvider;

    this.metadata = {
      name: "cTrader FIX Price Connection",
      version: "1.0.0",
      marketsSupported: ["GLOBAL"],
      assetClasses: CTRADER_ASSET_CLASSES,
      timeframes: [...CTRADER_TIMEFRAMES],
      supportsHistorical: false,
      supportsQuotes: true,
      supportsTicks: false,
      supportsStreaming: true,
      supportsCorporateActions: false,
      rateLimits: {
        requestsPerMinute: rateLimiter.requestsPerMinute,
      },
      healthStatus: "unknown",
    };
  }

  get enabled(): boolean {
    return this.configured;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  async subscribe(
    providerSymbol: string,
    requestId: string,
    providerInstrumentId: string,
  ): Promise<void> {
    await this.client.subscribe(
      providerSymbol,
      requestId,
      providerInstrumentId,
    );
  }

  get state() {
    return this.client.state;
  }
}
