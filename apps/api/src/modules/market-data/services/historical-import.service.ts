import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError, ValidationError } from "@rmsm/shared";
import { prisma, Prisma, CandleInterval, MarketDataProviderType } from "@rmsm/database";
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
import { planImportBatches, type ImportBatch } from "../utils/import-batch-planner";

export interface ImportHistoricalCandlesRequest {
  instrumentId: string;
  providerConfigId: string;
  interval: CandleInterval;
  from: Date;
  to: Date;
}

interface BatchImportResult {
  persisted: number;
  rejected: number;
}

/**
 * The write-side orchestrator: fetch → validate → deduplicate → persist,
 * atomically, with retry and audit.
 *
 * Large historical ranges are divided into deterministic 30-day batches.
 * Each successful batch advances the import job's resume cursor so an
 * interrupted import can be resumed without replaying completed batches.
 *
 * Provider-agnostic throughout: this service never references a
 * specific MarketDataProviderType by name in its logic.
 */
@Injectable()
export class HistoricalImportService {
  /**
   * Keep each persistence transaction bounded.
   *
   * A 30-day 1-minute import can contain ~43,200 candles.
   * Persisting all of them through one interactive Prisma transaction
   * can exceed the transaction timeout. Smaller chunks preserve the
   * existing idempotent upsert semantics while keeping transactions
   * short and recoverable.
   */
  private static readonly PERSIST_BATCH_SIZE = 500;

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

  async importHistoricalCandles(
    request: ImportHistoricalCandlesRequest,
    actorId: string | null,
  ): Promise<DataImportJobModel> {
    if (request.from >= request.to) {
      throw new ValidationError(
        "Historical import 'from' date must be earlier than 'to' date.",
      );
    }

    const instrument = await this.instrumentRepository.findById(
      request.instrumentId,
    );
    if (!instrument) {
      throw new NotFoundError("Instrument", request.instrumentId);
    }

    const providerConfig = await this.providerConfigRepository.findById(
      request.providerConfigId,
    );
    if (!providerConfig) {
      throw new NotFoundError(
        "MarketDataProviderConfig",
        request.providerConfigId,
      );
    }

    const aliases = await this.instrumentAliasRepository.findByInstrument(
      instrument.id,
    );
    const alias = aliases.find((a) => a.providerId === providerConfig.id);

    if (!alias) {
      throw new NotFoundError(
        "InstrumentAlias",
        `No alias exists mapping instrument ${instrument.id} to provider ${providerConfig.id} — register one before importing.`,
      );
    }

    const batches = planImportBatches(request.from, request.to);

    let job = await this.importJobRepository.create({
      providerId: providerConfig.id,
      jobType: "historical_backfill",
      instrumentId: instrument.id,
      interval: request.interval,
      dateRangeStart: request.from,
      dateRangeEnd: request.to,
      totalBatches: batches.length,
    });

    job = await this.importJobRepository.markRunning(job.id);

    try {
      let completedBatches = job.completedBatches ?? 0;
      let totalPersisted = job.recordsProcessed ?? 0;
      let totalRejected = job.recordsFailed ?? 0;

      const resumeCursor = job.resumeCursor;

      const batchesToRun = resumeCursor
        ? batches.filter((batch) => batch.from >= resumeCursor)
        : batches;

      for (const [index, batch] of batchesToRun.entries()) {
        const batchNumber =
          resumeCursor
            ? (job.completedBatches ?? 0) + index + 1
            : index + 1;

        const result = await this.runFetchValidatePersist(
          request,
          instrument.id,
          providerConfig.id,
          providerConfig.type,
          alias.providerSymbol,
          job.id,
          batch,
          batchNumber,
        );

        completedBatches = batchNumber;
        totalPersisted += result.persisted;
        totalRejected += result.rejected;

        this.metrics.increment(
          `import.${providerConfig.type}.candles_persisted`,
          result.persisted,
        );
        this.metrics.increment(
          `import.${providerConfig.type}.candles_rejected`,
          result.rejected,
        );
      }

      await prisma.$transaction(
        async (tx: Prisma.TransactionClient): Promise<void> => {
          await this.importJobRepository.markCompleted(
            job.id,
            totalPersisted,
            totalRejected,
            tx,
          );
        },
      );

      await this.auditService.log("market_data.historical_import.completed", {
        userId: actorId,
        entityType: "DataImportJob",
        entityId: job.id,
        metadata: {
          instrumentId: instrument.id,
          providerConfigId: providerConfig.id,
          persisted: totalPersisted,
          rejected: totalRejected,
          totalBatches: batches.length,
          completedBatches,
        },
      });

      const finalJob = await this.importJobRepository.findById(job.id);
      if (!finalJob) {
        throw new NotFoundError("DataImportJob", job.id);
      }

      return finalJob;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await this.importJobRepository.markFailed(job.id, message);
      this.metrics.increment(`import.${providerConfig.type}.failed`);

      await this.auditService.log("market_data.historical_import.failed", {
        userId: actorId,
        entityType: "DataImportJob",
        entityId: job.id,
        metadata: {
          instrumentId: instrument.id,
          providerConfigId: providerConfig.id,
          reason: message,
        },
      });

      this.logger.error(
        `Historical import job ${job.id} failed: ${message}`,
      );

      throw error;
    }
  }

  private async runFetchValidatePersist(
    request: ImportHistoricalCandlesRequest,
    instrumentId: string,
    providerId: string,
    providerType: MarketDataProviderType,
    providerSymbol: string,
    jobId: string,
    batch: ImportBatch,
    completedBatches: number,
  ): Promise<BatchImportResult> {
    const response = await this.orchestration.executeWithRetry(
      providerType,
      (provider) => {
        if (!provider.historicalDataClient) {
          throw new ValidationError(
            `Provider "${providerType}" does not support historical data.`,
          );
        }

        return provider.historicalDataClient.fetchCandles({
          providerSymbol,
          interval: request.interval,
          from: batch.from,
          to: batch.to,
        });
      },
    );

    const validCandles = [];
    let rejectedCount = 0;

    for (const candle of response.candles) {
      try {
        validateCandle(candle);
        validCandles.push(candle);
      } catch (error) {
        rejectedCount += 1;

        this.metrics.increment("validation.candle.rejected");

        await this.dataQualityIssueRepository.create({
          instrumentId,
          importJobId: jobId,
          issueType: "invalid_candle",
          severity: "high",
          description:
            error instanceof Error ? error.message : String(error),
        });
      }
    }

    const duplicateFindings = detectCandleDuplicates(validCandles);
    const duplicateIndexes = new Set(
      duplicateFindings.map((finding) => finding.index),
    );

    const toPersist = validCandles.filter(
      (_, index) => !duplicateIndexes.has(index),
    );

    rejectedCount += duplicateFindings.length;

    if (duplicateFindings.length > 0) {
      this.metrics.increment(
        "validation.candle.duplicate",
        duplicateFindings.length,
      );
    }

    /**
     * Persist in bounded transactions rather than placing the entire
     * provider batch inside one interactive transaction.
     *
     * The repository upsert remains unchanged, so historical imports
     * retain their existing idempotent behavior.
     */
    for (
      let offset = 0;
      offset < toPersist.length;
      offset += HistoricalImportService.PERSIST_BATCH_SIZE
    ) {
      const persistBatch = toPersist.slice(
        offset,
        offset + HistoricalImportService.PERSIST_BATCH_SIZE,
      );

      await prisma.$transaction(
        async (tx: Prisma.TransactionClient): Promise<void> => {
          for (const candle of persistBatch) {
            await this.candleRepository.upsert(
              {
                instrumentId,
                interval: candle.interval,
                eventTime: candle.eventTime,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
                volume: candle.volume,
                providerId,
                source: "HISTORICAL_IMPORT",
                importJobId: jobId,
              },
              tx,
            );
          }
        },
      );
    }

    /**
     * Advance the import cursor only after every persistence chunk
     * has committed successfully.
     *
     * If a later chunk fails, the job remains resumable. Replaying
     * already-persisted candles is safe because repository.upsert()
     * is idempotent on the candle's compound unique key.
     */
    await prisma.$transaction(
      async (tx: Prisma.TransactionClient): Promise<void> => {
        await this.importJobRepository.recordBatchProgress(
          jobId,
          completedBatches,
          batch.to,
          toPersist.length,
          rejectedCount,
          tx,
        );
      },
    );

    return {
      persisted: toPersist.length,
      rejected: rejectedCount,
    };
  }
}
