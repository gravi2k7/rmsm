import { Injectable, Logger } from "@nestjs/common";
import { CandleInterval, MarketDataSource } from "@rmsm/database";
import { NotFoundError, ValidationError } from "@rmsm/shared";
import { InstrumentRepository } from "../repositories/instrument.repository";
import { InstrumentAliasRepository } from "../repositories/instrument-alias.repository";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { MarketCandleRepository } from "../repositories/market-candle.repository";
import { ProviderOrchestrationService } from "./provider-orchestration.service";
import { validateCandle } from "../validation/candle.validator";

export interface LiveCandleSynchronizationResult {
  instrumentId: string;
  providerId: string;
  providerType: string;
  providerSymbol: string;
  interval: CandleInterval;
  persisted: number;
  eventTimes: Date[];
}

/**
 * Provider-agnostic live OHLC synchronization.
 *
 * Unlike QuoteSynchronizationService, this service never manufactures
 * OHLC values from a quote. It requests real provider candles through
 * HistoricalDataClient.fetchCandles(), validates them, and persists
 * them as LIVE candles.
 */
@Injectable()
export class LiveCandleSynchronizationService {
  private readonly logger = new Logger(
    LiveCandleSynchronizationService.name,
  );

  constructor(
    private readonly instrumentRepository: InstrumentRepository,
    private readonly instrumentAliasRepository: InstrumentAliasRepository,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly candleRepository: MarketCandleRepository,
    private readonly orchestration: ProviderOrchestrationService,
  ) {}

  async synchronizeInstrument(
    instrumentId: string,
    interval: CandleInterval = CandleInterval.ONE_MINUTE,
    now: Date = new Date(),
  ): Promise<LiveCandleSynchronizationResult> {
    const instrument = await this.instrumentRepository.findById(instrumentId);

    if (!instrument) {
      throw new NotFoundError("Instrument", instrumentId);
    }

    const providerConfigs =
      await this.providerConfigRepository.listActiveByPriority();

    const aliases =
      await this.instrumentAliasRepository.findByInstrument(instrumentId);

    const intervalMs = 60_000;

    const minuteStart = new Date(
      Math.floor(now.getTime() / intervalMs) * intervalMs,
    );

    for (const providerConfig of providerConfigs) {
      const alias = aliases.find(
        (candidate) => candidate.providerId === providerConfig.id,
      );

      if (!alias) {
        continue;
      }

      const response = await this.orchestration.executeWithRetry(
        providerConfig.type,
        async (provider) => {
          if (!provider.historicalDataClient) {
            throw new ValidationError(
              `Provider "${providerConfig.type}" does not support historical candles.`,
            );
          }

          return provider.historicalDataClient.fetchCandles({
            providerSymbol: alias.providerSymbol,
            interval,
            from: minuteStart,
            to: now,
          });
        },
      );

      let persisted = 0;
      const eventTimes: Date[] = [];

      for (const candle of response.candles) {
        if (candle.providerSymbol !== alias.providerSymbol) {
          throw new ValidationError(
            `Provider "${providerConfig.type}" returned symbol "${candle.providerSymbol}" for requested symbol "${alias.providerSymbol}".`,
          );
        }

        if (candle.interval !== interval) {
          throw new ValidationError(
            `Provider "${providerConfig.type}" returned interval "${candle.interval}" for requested interval "${interval}".`,
          );
        }

        validateCandle(candle);

        /*
         * Only persist candles belonging to the requested current interval
         * window. Providers may return adjacent candles around the requested
         * boundary.
         */
        if (
          candle.eventTime.getTime() < minuteStart.getTime() ||
          candle.eventTime.getTime() >= minuteStart.getTime() + intervalMs
        ) {
          continue;
        }

        await this.candleRepository.upsert({
          instrumentId,
          interval,
          eventTime: candle.eventTime,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          providerId: providerConfig.id,
          source: MarketDataSource.LIVE,
          sourceTimestamp: candle.sourceTimestamp,
        });

        persisted += 1;
        eventTimes.push(candle.eventTime);
      }

      if (persisted > 0) {
        this.logger.debug(
          `Synchronized ${persisted} live ${interval} candle(s) for ${instrument.symbol} via ${providerConfig.type} (${alias.providerSymbol}).`,
        );

        return {
          instrumentId,
          providerId: providerConfig.id,
          providerType: providerConfig.type,
          providerSymbol: alias.providerSymbol,
          interval,
          persisted,
          eventTimes,
        };
      }

      this.logger.debug(
        `Provider ${providerConfig.type} returned no current ${interval} candle for ${instrument.symbol} (${alias.providerSymbol}).`,
      );
    }

    throw new NotFoundError(
      "InstrumentAlias",
      `No active provider returned a current ${interval} candle for instrument ${instrumentId}.`,
    );
  }
}
