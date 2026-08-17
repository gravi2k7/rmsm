import { Injectable, Logger } from "@nestjs/common";
import { MarketDataSource } from "@rmsm/database";
import { NotFoundError, ValidationError } from "@rmsm/shared";
import { InstrumentRepository } from "../repositories/instrument.repository";
import { InstrumentAliasRepository } from "../repositories/instrument-alias.repository";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { MarketQuoteRepository } from "../repositories/market-quote.repository";
import { ProviderOrchestrationService } from "./provider-orchestration.service";

export interface QuoteSynchronizationResult {
  instrumentId: string;
  providerId: string;
  providerType: string;
  providerSymbol: string;
  quoteId: string;
  eventTime: Date;
}

/**
 * Provider-agnostic quote write-side orchestration.
 *
 * Resolution order:
 *   instrument
 *     -> active provider configurations by priority
 *     -> matching InstrumentAlias
 *     -> provider quote capability
 *     -> normalized quote
 *     -> MarketQuoteRepository
 *
 * This service deliberately contains no scheduler/timer. A future
 * scheduler may invoke synchronizeInstrument() periodically.
 */
@Injectable()
export class QuoteSynchronizationService {
  private readonly logger = new Logger(QuoteSynchronizationService.name);

  constructor(
    private readonly instrumentRepository: InstrumentRepository,
    private readonly instrumentAliasRepository: InstrumentAliasRepository,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly quoteRepository: MarketQuoteRepository,
    private readonly orchestration: ProviderOrchestrationService,
  ) {}

  async synchronizeInstrument(
    instrumentId: string,
  ): Promise<QuoteSynchronizationResult> {
    const instrument = await this.instrumentRepository.findById(instrumentId);

    if (!instrument) {
      throw new NotFoundError("Instrument", instrumentId);
    }

    const providerConfigs =
      await this.providerConfigRepository.listActiveByPriority();

    const aliases =
      await this.instrumentAliasRepository.findByInstrument(instrumentId);

    for (const providerConfig of providerConfigs) {
      const alias = aliases.find(
        (candidate) => candidate.providerId === providerConfig.id,
      );

      if (!alias) {
        continue;
      }

      const quote = await this.orchestration.executeWithRetry(
        providerConfig.type,
        async (provider) => {
          if (!provider.quoteClient) {
            throw new ValidationError(
              `Provider "${providerConfig.type}" does not support quotes.`,
            );
          }

          return provider.quoteClient.fetchLatestQuote(
            alias.providerSymbol,
          );
        },
      );

      if (quote.providerSymbol !== alias.providerSymbol) {
        throw new ValidationError(
          `Provider "${providerConfig.type}" returned symbol "${quote.providerSymbol}" for requested symbol "${alias.providerSymbol}".`,
        );
      }

      const persisted = await this.quoteRepository.create({
        instrumentId,
        bidPrice: quote.bidPrice,
        askPrice: quote.askPrice,
        lastPrice: quote.lastPrice,
        bidSize: quote.bidSize,
        askSize: quote.askSize,
        eventTime: quote.eventTime,
        providerId: providerConfig.id,
        source: MarketDataSource.LIVE,
        sourceTimestamp: quote.sourceTimestamp,
      });

      this.logger.debug(
        `Synchronized live quote for ${instrument.symbol} via ${providerConfig.type} (${alias.providerSymbol}).`,
      );

      return {
        instrumentId,
        providerId: providerConfig.id,
        providerType: providerConfig.type,
        providerSymbol: alias.providerSymbol,
        quoteId: persisted.id,
        eventTime: persisted.eventTime,
      };
    }

    throw new NotFoundError(
      "InstrumentAlias",
      `No active provider alias exists for instrument ${instrumentId}.`,
    );
  }
}
