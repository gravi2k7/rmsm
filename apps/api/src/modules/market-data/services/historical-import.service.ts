import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError, ValidationError } from "@rmsm/shared";
import { prisma, Prisma, CandleInterval } from "@rmsm/database";
import { InstrumentRepository } from "../repositories/instrument.repository";
import { InstrumentAliasRepository } from "../repositories/instrument-alias.repository";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { MarketCandleRepository } from "../repositories/market-candle.repository";
import { DataImportJobRepository } from "../repositories/data-import-job.repository";
import { DataQualityIssueRepository } from "../repositories/data-quality-issue.repository";
import type { DataImportJobModel } from "../interfaces/models/operational.models";
import { ProviderOrchestrationService } from "./provider-orchestration.service";
import { MarketDataMetricsService } from "./market-data-metrics.service";
import { validateCandle } from "../validation/candle.validator";
import { detectCandleDuplicates } from "../validation/duplicate-detector";
import { AuditService } from "../../auth/services/audit.service";

export interface ImportHistoricalCandlesRequest {
  instrumentId: string;
  providerConfigId: string;
  interval: CandleInterval;
  from: Date;
  to: Date;
}

/**
 * The write-side orchestrator: fetch → validate → deduplicate → persist,
 * atomically, with retry and audit. This is where Phase 2A's
 * repositories, Phase 2B's provider infrastructure, and Phase 2C's
 * normalization/validation layer are finally composed together into a
 * real, callable operation — the first phase any of those three
 * previous phases' pieces actually run end to end in combination.
 *
 * Provider-agnostic throughout: this service never references a
 * specific `MarketDataProviderType` by name in its logic, only via
 * whatever `providerConfigId` the caller supplies — the same rule
 * carried forward from every prior phase's architecture section.
 */
@Injectable()
export class HistoricalImportService {
  private readonly logger = new Logger(HistoricalImportService.name);

  constructor(
    private readonly instrumentRepository: InstrumentRepository,
    private readonly instrumentAliasRepository: InstrumentAliasRepository,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly candleRepository: MarketCandleRepository,
    private readonly importJobRepository: DataImportJobRepository,
    private readonly dataQualityIssueRepository: DataQualityIssueRepository,
    private readonly orchestration: ProviderOrchestrationService,
    private readonly metrics: MarketDataMetricsService,
    private readonly auditService: AuditService,
  ) {}

  async importHistoricalCandles(request: ImportHistoricalCandlesRequest, actorId: string | null): Promise<DataImportJobModel> {
    const instrument = await this.instrumentRepository.findById(request.instrumentId);
    if (!instrument) throw new NotFoundError("Instrument", request.instrumentId);

    const providerConfig = await this.providerConfigRepository.findById(request.providerConfigId);
    if (!providerConfig) throw new NotFoundError("MarketDataProviderConfig", request.providerConfigId);

    const aliases = await this.instrumentAliasRepository.findByInstrument(instrument.id);
    const alias = aliases.find((a) => a.providerId === providerConfig.id);
    if (!alias) {
      throw new NotFoundError("InstrumentAlias", `No alias exists mapping instrument ${instrument.id} to provider ${providerConfig.id} — register one before importing.`);
    }

    let job = await this.importJobRepository.create({ providerId: providerConfig.id, jobType: "historical_backfill" });
    job = await this.importJobRepository.markRunning(job.id);

    try {
      const response = await this.orchestration.executeWithRetry(providerConfig.type, (provider) => {
        if (!provider.historicalDataClient) {
          throw new ValidationError(`Provider "${providerConfig.type}" does not support historical data.`);
        }
        return provider.historicalDataClient.fetchCandles({
          providerSymbol: alias.providerSymbol,
          interval: request.interval,
          from: request.from,
          to: request.to,
        });
      });

      const validCandles = [];
      let rejectedCount = 0;
      for (const candle of response.candles) {
        try {
          validateCandle(candle);
          validCandles.push(candle);
        } catch (error) {
          rejectedCount += 1;
          await this.dataQualityIssueRepository.create({
            instrumentId: instrument.id,
            importJobId: job.id,
            issueType: "invalid_candle",
            severity: "high",
            description: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const duplicateFindings = detectCandleDuplicates(validCandles);
      const duplicateIndexes = new Set(duplicateFindings.map((f) => f.index));
      const toPersist = validCandles.filter((_, index) => !duplicateIndexes.has(index));
      rejectedCount += duplicateFindings.length;

      // Transaction boundary: every candle in this batch plus the job's
      // final status update commit atomically — a partial write (some
      // candles persisted, job left RUNNING) would leave a caller unable
      // to tell whether the import actually finished.
      await prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<void> => {
        for (const candle of toPersist) {
          await this.candleRepository.upsert(
            {
              instrumentId: instrument.id,
              interval: candle.interval,
              eventTime: candle.eventTime,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume,
              providerId: providerConfig.id,
              source: "HISTORICAL_IMPORT",
              importJobId: job.id,
            },
            tx,
          );
        }
        await this.importJobRepository.markCompleted(job.id, toPersist.length, rejectedCount, tx);
      });

      this.metrics.increment(`import.${providerConfig.type}.candles_persisted`, toPersist.length);
      this.metrics.increment(`import.${providerConfig.type}.candles_rejected`, rejectedCount);

      await this.auditService.log("market_data.historical_import.completed", {
        userId: actorId,
        entityType: "DataImportJob",
        entityId: job.id,
        metadata: { instrumentId: instrument.id, providerConfigId: providerConfig.id, persisted: toPersist.length, rejected: rejectedCount },
      });

      const finalJob = await this.importJobRepository.findById(job.id);
      if (!finalJob) throw new NotFoundError("DataImportJob", job.id); // genuinely unreachable — we just wrote this row inside the transaction above
      return finalJob;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.importJobRepository.markFailed(job.id, message);
      this.metrics.increment(`import.${providerConfig.type}.failed`);
      await this.auditService.log("market_data.historical_import.failed", {
        userId: actorId,
        entityType: "DataImportJob",
        entityId: job.id,
        metadata: { instrumentId: instrument.id, providerConfigId: providerConfig.id, reason: message },
      });
      this.logger.error(`Historical import job ${job.id} failed: ${message}`);
      throw error;
    }
  }
}
