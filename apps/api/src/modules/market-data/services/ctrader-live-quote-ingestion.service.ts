import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { CTraderFixClient } from "../providers/ctrader/ctrader-fix.client";
import { InstrumentAliasRepository } from "../repositories/instrument-alias.repository";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { MarketDataStreamPublisher } from "./market-data-stream.publisher";

interface LiveQuote {
  providerSymbol: string;
  bidPrice?: string;
  askPrice?: string;
  lastPrice?: string;
  bidSize?: string;
  askSize?: string;
  eventTime: Date;
  sourceTimestamp?: Date;
}

interface LiveDepthLevel {
  price: string;
  size?: string;
}

interface LiveDepth {
  providerSymbol: string;
  bids: LiveDepthLevel[];
  asks: LiveDepthLevel[];
  eventTime: Date;
}

@Injectable()
export class CTraderLiveQuoteIngestionService implements OnModuleInit {
  private readonly logger = new Logger(
    CTraderLiveQuoteIngestionService.name,
  );

  private subscriptionGeneration = 0;

  /**
   * Live provider context is loaded once when the FIX session logs on.
   *
   * Quotes are deliberately NOT persisted here. They are transient market
   * data used by the realtime stream and the in-memory candle builder.
   */
  private providerId: string | null = null;

  private readonly aliasesBySymbol = new Map<
    string,
    {
      instrumentId: string;
      providerSymbol: string;
      providerInstrumentId?: string | null;
    }
  >();

  constructor(
    private readonly client: CTraderFixClient,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly aliases: InstrumentAliasRepository,
    private readonly streamPublisher: MarketDataStreamPublisher,
  ) {}

  onModuleInit(): void {
    this.client.on("quote", (quote: LiveQuote) => {
      this.handleQuote(quote);
    });

    this.client.on("depth", (depth: LiveDepth) => {
      this.handleDepth(depth);
    });

    this.client.on("loggedOn", () => {
      void this.handleLoggedOn();
    });

    this.logger.log(
      "cTrader live quote ingestion listener registered.",
    );
  }

  private async handleLoggedOn(): Promise<void> {
    try {
      await this.loadLiveContext();
      await this.subscribeConfiguredSymbols();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to initialize cTrader live quote ingestion: ${message}`,
      );
    }
  }

  private async loadLiveContext(): Promise<void> {
    const provider =
      await this.providerConfigRepository.findByType("CTRADER");

    this.aliasesBySymbol.clear();
    this.providerId = null;

    if (!provider || !provider.isActive) {
      this.logger.warn(
        "cTrader FIX logged on but no active CTRADER provider configuration exists.",
      );
      return;
    }

    const aliases = await this.aliases.findByProvider(provider.id);

    this.providerId = provider.id;

    for (const alias of aliases) {
      this.aliasesBySymbol.set(alias.providerSymbol, {
        instrumentId: alias.instrumentId,
        providerSymbol: alias.providerSymbol,
        providerInstrumentId: alias.providerInstrumentId,
      });
    }

    this.logger.log(
      `Loaded cTrader live context: ${aliases.length} instrument alias(es).`,
    );
  }

  private handleQuote(quote: LiveQuote): void {
    const alias = this.aliasesBySymbol.get(quote.providerSymbol);

    if (!this.providerId || !alias) {
      return;
    }

    /*
     * Quotes are transient realtime market data.
     *
     * Publish immediately. PostgreSQL is intentionally not involved in the
     * quote path.
     */
    this.streamPublisher.publishQuote({
      instrumentId: alias.instrumentId,
      providerSymbol: quote.providerSymbol,
      bidPrice: quote.bidPrice,
      askPrice: quote.askPrice,
      lastPrice: quote.lastPrice,
      bidSize: quote.bidSize,
      askSize: quote.askSize,
      eventTime: quote.eventTime,
      sourceTimestamp: quote.sourceTimestamp,
    });
  }

  private handleDepth(depth: LiveDepth): void {
    const alias = this.aliasesBySymbol.get(depth.providerSymbol);

    if (!this.providerId || !alias) {
      return;
    }

    this.streamPublisher.publishDepth({
      instrumentId: alias.instrumentId,
      providerSymbol: depth.providerSymbol,
      bids: depth.bids,
      asks: depth.asks,
      eventTime: depth.eventTime,
    });
  }

  private async subscribeConfiguredSymbols(): Promise<void> {
    const generation = ++this.subscriptionGeneration;

    if (!this.providerId) {
      return;
    }

    const aliases = [...this.aliasesBySymbol.values()];

    if (aliases.length === 0) {
      this.logger.warn(
        `cTrader FIX logged on but no InstrumentAlias records exist for provider ${this.providerId}.`,
      );
      return;
    }

    this.logger.log(
      `Subscribing cTrader live quotes for ${aliases.length} instrument alias(es).`,
    );

    for (const alias of aliases) {
      if (generation !== this.subscriptionGeneration) {
        return;
      }

      if (!alias.providerInstrumentId) {
        this.logger.warn(
          `Skipping cTrader live subscription without providerInstrumentId: ${alias.providerSymbol}`,
        );
        continue;
      }

      const requestId =
        `RMSM-QUOTE-${alias.providerSymbol}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;

      try {
        await this.client.subscribe(
          alias.providerSymbol,
          requestId,
          alias.providerInstrumentId,
        );

        this.logger.log(
          `Subscribed cTrader live quote: ${alias.providerSymbol} ` +
            `(providerInstrumentId=${alias.providerInstrumentId}, ${requestId})`,
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Failed to subscribe cTrader symbol ${alias.providerSymbol}: ${message}`,
        );
      }
    }
  }
}
