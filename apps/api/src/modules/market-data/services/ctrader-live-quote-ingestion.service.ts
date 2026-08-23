import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { MarketDataSource } from "@rmsm/database";

import { CTraderFixClient } from "../providers/ctrader/ctrader-fix.client";
import { InstrumentAliasRepository } from "../repositories/instrument-alias.repository";
import { MarketQuoteRepository } from "../repositories/market-quote.repository";

import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { MarketDataStreamPublisher } from "./market-data-stream.publisher";

@Injectable()
export class CTraderLiveQuoteIngestionService implements OnModuleInit {
  private readonly logger = new Logger(
    CTraderLiveQuoteIngestionService.name,
  );

  private subscriptionGeneration = 0;

  constructor(
    private readonly client: CTraderFixClient,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly aliases: InstrumentAliasRepository,
    private readonly quotes: MarketQuoteRepository,
    private readonly streamPublisher: MarketDataStreamPublisher,
  ) {}

  onModuleInit(): void {
    this.client.on("quote", (quote) => {
      void this.persistQuote(quote).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Failed to persist cTrader live quote for ${quote.providerSymbol}: ${message}`,
        );
      });
    });

    this.client.on("loggedOn", () => {
      void this.subscribeConfiguredSymbols().catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Failed to subscribe cTrader live symbols: ${message}`,
        );
      });
    });

    this.logger.log("cTrader live quote ingestion listener registered.");
  }

  private async subscribeConfiguredSymbols(): Promise<void> {
    const generation = ++this.subscriptionGeneration;

    const provider =
      await this.providerConfigRepository.findByType("CTRADER");

    if (!provider || !provider.isActive) {
      this.logger.warn(
        "cTrader FIX logged on but no active CTRADER provider configuration exists.",
      );
      return;
    }

    const aliases = await this.aliases.findByProvider(provider.id);

    if (aliases.length === 0) {
      this.logger.warn(
        `cTrader FIX logged on but no InstrumentAlias records exist for provider ${provider.id}.`,
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

      const requestId =
        `RMSM-QUOTE-${alias.providerSymbol}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;

      if (!alias.providerInstrumentId) {
        this.logger.warn(
          `Skipping cTrader live subscription without providerInstrumentId: ${alias.providerSymbol}`,
        );
        continue;
      }

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

  private async persistQuote(quote: {
    providerSymbol: string;
    bidPrice?: string;
    askPrice?: string;
    lastPrice?: string;
    bidSize?: string;
    askSize?: string;
    eventTime: Date;
    sourceTimestamp?: Date;
  }): Promise<void> {
    const provider =
      await this.providerConfigRepository.findByType("CTRADER");

    if (!provider || !provider.isActive) {
      return;
    }

    const alias = await this.aliases.findByProviderSymbol(
      provider.id,
      quote.providerSymbol,
    );

    if (!alias) {
      this.logger.debug(
        `Ignoring cTrader quote without InstrumentAlias: ${quote.providerSymbol}`,
      );
      return;
    }

    const persisted = await this.quotes.create({
      instrumentId: alias.instrumentId,
      bidPrice: quote.bidPrice,
      askPrice: quote.askPrice,
      lastPrice: quote.lastPrice,
      bidSize: quote.bidSize,
      askSize: quote.askSize,
      eventTime: quote.eventTime,
      providerId: provider.id,
      source: MarketDataSource.LIVE,
      sourceTimestamp: quote.sourceTimestamp,
    });

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

    this.logger.debug(
      `Persisted cTrader live quote: ${quote.providerSymbol} -> ${persisted.id}`,
    );

  }

}
