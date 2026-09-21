import { Injectable, Logger } from "@nestjs/common";
import {
  CandleInterval,
  DataGapStatus,
  InstrumentStatus,
} from "@rmsm/database";
import { NotFoundError, ValidationError } from "@rmsm/shared";
import type {
  BackfillRequest,
  BackfillResult,
  BackfillWorkflow,
} from "../contracts/workflow.contracts";
import { DataGapRepository } from "../repositories/data-gap.repository";
import { InstrumentRepository } from "../repositories/instrument.repository";
import { InstrumentAliasRepository } from "../repositories/instrument-alias.repository";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { MarketCandleRepository } from "../repositories/market-candle.repository";
import { ProviderRegistryService } from "../providers/provider-registry.service";
import { ProviderOrchestrationService } from "./provider-orchestration.service";
import { validateCandle } from "../validation/candle.validator";
import { detectCandleDuplicates } from "../validation/duplicate-detector";
import { candleIntervalToMs } from "../constants/candle-interval.constants";

@Injectable()
export class BackfillWorkflowService implements BackfillWorkflow {
  private readonly logger = new Logger(BackfillWorkflowService.name);

  constructor(
    private readonly dataGapRepository: DataGapRepository,
    private readonly instrumentRepository: InstrumentRepository,
    private readonly instrumentAliasRepository: InstrumentAliasRepository,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly candleRepository: MarketCandleRepository,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly orchestration: ProviderOrchestrationService,
  ) {}

  async execute(request: BackfillRequest): Promise<BackfillResult> {
    const gap = await this.dataGapRepository.findById(request.gapId);

    if (!gap) {
      throw new NotFoundError("DataGap", request.gapId);
    }

    if (gap.instrumentId !== request.instrumentId) {
      throw new ValidationError(
        `DataGap ${request.gapId} belongs to instrument ${gap.instrumentId}, not ${request.instrumentId}.`,
      );
    }

    if (
      gap.status === DataGapStatus.RESOLVED ||
      gap.status === DataGapStatus.IGNORED
    ) {
      return {
        gap,
        candlesBackfilled: 0,
        succeeded: true,
      };
    }

    const instrument = await this.instrumentRepository.findById(
      request.instrumentId,
    );

    if (!instrument) {
      throw new NotFoundError("Instrument", request.instrumentId);
    }

    if (instrument.status !== InstrumentStatus.ACTIVE) {
      return {
        gap,
        candlesBackfilled: 0,
        succeeded: false,
        failureReason: `Instrument ${instrument.symbol} is not active.`,
      };
    }

    await this.dataGapRepository.incrementRepairAttempts(request.gapId);
    await this.dataGapRepository.markStatus(
      request.gapId,
      DataGapStatus.BACKFILLING,
    );

    try {
      const configs =
        await this.providerConfigRepository.listActiveByPriority();

      const aliases =
        await this.instrumentAliasRepository.findByInstrument(
          request.instrumentId,
        );

      let lastFailure = "No historical provider could repair the gap.";

      for (const config of configs) {
        const alias = aliases.find(
          (candidate) => candidate.providerId === config.id,
        );

        if (!alias) {
          continue;
        }

        const provider = this.providerRegistry.tryGet(config.type);

        if (
          !provider ||
          !provider.enabled ||
          !provider.metadata.supportsHistorical ||
          !provider.historicalDataClient
        ) {
          continue;
        }

        try {
          const intervalMs = candleIntervalToMs(gap.interval);
          const historicalTo = new Date(
            gap.gapEnd.getTime() + intervalMs,
          );

          const response = await this.orchestration.executeWithRetry(
            config.type,
            (resolvedProvider) => {
              if (!resolvedProvider.historicalDataClient) {
                throw new ValidationError(
                  `Provider "${config.type}" does not support historical candles.`,
                );
              }

              return resolvedProvider.historicalDataClient.fetchCandles({
                providerSymbol: alias.providerSymbol,
                interval: gap.interval,
                from: gap.gapStart,
                to: historicalTo,
              });
            },
          );

          const validCandles = [];
          for (const candle of response.candles) {
            try {
              validateCandle(candle);
              if (
                candle.providerSymbol === alias.providerSymbol &&
                candle.interval === gap.interval &&
                candle.eventTime >= gap.gapStart &&
                candle.eventTime <= gap.gapEnd
              ) {
                validCandles.push(candle);
              }
            } catch {
              // Invalid provider candles are ignored; coverage verification
              // below determines whether the gap can actually be resolved.
            }
          }

          const duplicateFindings = detectCandleDuplicates(validCandles);
          const duplicateIndexes = new Set(
            duplicateFindings.map((finding) => finding.index),
          );

          const toPersist = validCandles.filter(
            (_, index) => !duplicateIndexes.has(index),
          );

          let persisted = 0;

          for (const candle of toPersist) {
            const before = await this.candleRepository.findCurrentValueAt(
              request.instrumentId,
              gap.interval,
              candle.eventTime,
            );

            if (before) {
              continue;
            }

            await this.candleRepository.upsertBackfill({
              instrumentId: request.instrumentId,
              interval: gap.interval,
              eventTime: candle.eventTime,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume,
              providerId: config.id,
              sourceTimestamp: candle.sourceTimestamp,
            });

            persisted += 1;
          }

          const expected: Date[] = [];

          for (
            let timestamp = gap.gapStart.getTime();
            timestamp <= gap.gapEnd.getTime();
            timestamp += intervalMs
          ) {
            expected.push(new Date(timestamp));
          }

          let covered = 0;

          for (const eventTime of expected) {
            const current =
              await this.candleRepository.findCurrentValueAt(
                request.instrumentId,
                gap.interval,
                eventTime,
              );

            if (current) {
              covered += 1;
            }
          }

          if (covered === expected.length) {
            const resolved = await this.dataGapRepository.markRepaired(
              request.gapId,
              config.id,
            );

            this.logger.log(
              `Backfilled ${persisted} candle(s) for gap ${request.gapId} using ${config.type}.`,
            );

            return {
              gap: resolved,
              candlesBackfilled: persisted,
              succeeded: true,
            };
          }

          lastFailure =
            `Provider "${config.type}" returned incomplete coverage: ${covered}/${expected.length} expected candle(s).`;

          this.logger.warn(lastFailure);
        } catch (error) {
          lastFailure =
            error instanceof Error ? error.message : String(error);

          this.logger.warn(
            `Backfill provider ${config.type} failed for gap ${request.gapId}: ${lastFailure}`,
          );
        }
      }

      const unresolved = await this.dataGapRepository.markStatus(
        request.gapId,
        DataGapStatus.UNRESOLVED,
      );

      return {
        gap: unresolved,
        candlesBackfilled: 0,
        succeeded: false,
        failureReason: lastFailure,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      await this.dataGapRepository.markStatus(
        request.gapId,
        DataGapStatus.UNRESOLVED,
      );

      return {
        gap:
          (await this.dataGapRepository.findById(request.gapId)) ?? gap,
        candlesBackfilled: 0,
        succeeded: false,
        failureReason: message,
      };
    }
  }
}
