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
import type { InstrumentModel } from "../interfaces/models/reference-data.models";
import type { MarketDataProviderConfigModel } from "../interfaces/models/reference-data.models";
import { ProviderOrchestrationService } from "./provider-orchestration.service";
import { MarketDataMetricsService } from "./market-data-metrics.service";
import { MarketDataStreamPublisherService, MARKET_DATA_STREAMS } from "./market-data-stream-publisher.service";
import { QualityScoringService } from "./quality-scoring.service";
import { validateCandle } from "../validation/candle.validator";
import { detectCandleDuplicates } from "../validation/duplicate-detector";
import { planImportBatches } from "../utils/import-batch-planner";
import { AuditService } from "../../auth/services/audit.service";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { FIP001_EVENTS } from "../../../common/events/fip001-events";

export interface ImportHistoricalCandlesRequest {
  instrumentId: string;
  providerConfigId: string;
  interval: CandleInterval;
  from: Date;
  to: Date;
}

interface BatchWriteResult {
  persisted: number;
  rejected: number;
}

/**
 * The write-side orchestrator: fetch → validate → deduplicate → persist,
 * atomically, with retry and audit. This is where Phase 2A's
 * repositories, Phase 2B's provider infrastructure, and Phase 2C's
 * normalization/validation layer are finally composed together into a
 * real, callable operation.
 *
 * FIP-001 additions: `runFetchValidatePersist` extracts the original
 * (Phase 3) single-range fetch/validate/dedupe/persist logic into a
 * reusable primitive so `runBatchedImport` (Domain 3 "batch processing" /
 * "resume interrupted imports" / "one-click"+"date range" import) can
 * call it once per batch of a larger job instead of duplicating that
 * logic. `importHistoricalCandles` (the original public method) keeps
 * its exact original signature and behavior — every existing caller is
 * unaffected — now implemented as "one job, one batch covering the
 * whole requested range" via the same shared primitive.
 *
 * Provider-agnostic throughout: this service never references a
 * specific `MarketDataProviderType` by name in its logic, only via
 * whatever `providerConfigId` the caller supplies.
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
    private readonly streamPublisher: MarketDataStreamPublisherService,
    private readonly auditService: AuditService,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly qualityScoringService: QualityScoringService,
  ) {}

  async importHistoricalCandles(request: ImportHistoricalCandlesRequest, actorId: string | null): Promise<DataImportJobModel> {
    const instrument = await this.instrumentRepository.findById(request.instrumentId);
    if (!instrument) throw new NotFoundError("Instrument", request.instrumentId);

    const providerConfig = await this.providerConfigRepository.findById(request.providerConfigId);
    if (!providerConfig) throw new NotFoundError("MarketDataProviderConfig", request.providerConfigId);

    const alias = await this.resolveAlias(instrument.id, providerConfig.id);

    let job = await this.importJobRepository.create({
      providerId: providerConfig.id,
      jobType: "historical_backfill",
      instrumentId: instrument.id,
      interval: request.interval,
      dateRangeStart: request.from,
      dateRangeEnd: request.to,
      totalBatches: 1,
    });
    job = await this.importJobRepository.markRunning(job.id);
    await this.publishImportEvent(FIP001_EVENTS.IMPORT_STARTED, job, instrument, providerConfig);

    try {
      const { persisted, rejected } = await this.runFetchValidatePersist(job.id, instrument, providerConfig, alias, request.interval, request.from, request.to);

      await prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<void> => {
        await this.importJobRepository.markCompleted(job.id, persisted, rejected, tx);
      });

      this.metrics.increment(`import.${providerConfig.type}.candles_persisted`, persisted);
      this.metrics.increment(`import.${providerConfig.type}.candles_rejected`, rejected);

      await this.auditService.log("market_data.historical_import.completed", {
        userId: actorId,
        entityType: "DataImportJob",
        entityId: job.id,
        metadata: { instrumentId: instrument.id, providerConfigId: providerConfig.id, persisted, rejected },
      });

      const finalJob = await this.importJobRepository.findById(job.id);
      if (!finalJob) throw new NotFoundError("DataImportJob", job.id); // genuinely unreachable — we just wrote this row above
      await this.publishImportEvent(FIP001_EVENTS.IMPORT_COMPLETED, finalJob, instrument, providerConfig);
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
      const failedJob = await this.importJobRepository.findById(job.id);
      if (failedJob) await this.publishImportEvent(FIP001_EVENTS.IMPORT_FAILED, failedJob, instrument, providerConfig, message);
      throw error;
    }
  }

  /**
   * FIP-001 Domain 3 — runs (or resumes) an already-created, batchable
   * job: one whose `instrumentId`/`interval`/`dateRangeStart`/
   * `dateRangeEnd` are populated (see ImportSchedulerService.
   * scheduleImport()). Splits the remaining range
   * ([job.resumeCursor ?? dateRangeStart, dateRangeEnd)) into batches via
   * planImportBatches, persists progress after each batch succeeds
   * (recordBatchProgress), so a crash mid-run leaves resumeCursor at the
   * last completed batch boundary — a subsequent call with the same
   * jobId picks up from there instead of re-fetching/re-validating
   * already-persisted data.
   */
  async runBatchedImport(jobId: string): Promise<DataImportJobModel> {
    const job = await this.importJobRepository.findById(jobId);
    if (!job) throw new NotFoundError("DataImportJob", jobId);
    if (!job.instrumentId || !job.interval || !job.dateRangeStart || !job.dateRangeEnd) {
      throw new ValidationError(`Import job ${jobId} is missing instrumentId/interval/dateRangeStart/dateRangeEnd — not a batchable job.`);
    }

    const instrument = await this.instrumentRepository.findById(job.instrumentId);
    if (!instrument) throw new NotFoundError("Instrument", job.instrumentId);
    const providerConfig = await this.providerConfigRepository.findById(job.providerId);
    if (!providerConfig) throw new NotFoundError("MarketDataProviderConfig", job.providerId);
    const alias = await this.resolveAlias(instrument.id, providerConfig.id);

    if (job.status === "PENDING") {
      await this.importJobRepository.markRunning(jobId);
      await this.publishImportEvent(FIP001_EVENTS.IMPORT_STARTED, job, instrument, providerConfig);
    }

    const rangeStart = job.resumeCursor ?? job.dateRangeStart;
    const batches = planImportBatches(rangeStart, job.dateRangeEnd);
    const totalBatches = job.totalBatches ?? batches.length;
    if (!job.totalBatches) {
      // First run (not a resume) — record the real batch count now that we know it.
      await prisma.dataImportJob.update({ where: { id: jobId }, data: { totalBatches } });
    }

    let completedBatches = job.completedBatches;

    try {
      for (const batch of batches) {
        const { persisted, rejected } = await this.runFetchValidatePersist(jobId, instrument, providerConfig, alias, job.interval, batch.from, batch.to);
        completedBatches += 1;
        await this.importJobRepository.recordBatchProgress(jobId, completedBatches, batch.to, persisted, rejected);
        this.metrics.increment(`import.${providerConfig.type}.candles_persisted`, persisted);
        this.metrics.increment(`import.${providerConfig.type}.candles_rejected`, rejected);
      }

      // markCompleted SETS recordsProcessed/recordsFailed (not increment) — recordBatchProgress already
      // accumulated the true totals across every batch, so re-read the job first and pass those totals
      // straight through rather than re-deriving them or risking a 0/0 overwrite.
      const accumulated = await this.importJobRepository.findById(jobId);
      const completed = await this.importJobRepository.markCompleted(jobId, accumulated?.recordsProcessed ?? 0, accumulated?.recordsFailed ?? 0);
      await this.auditService.log("market_data.historical_import.completed", {
        userId: null,
        entityType: "DataImportJob",
        entityId: jobId,
        metadata: { instrumentId: instrument.id, providerConfigId: providerConfig.id, totalBatches, completedBatches },
      });
      await this.publishImportEvent(FIP001_EVENTS.IMPORT_COMPLETED, completed, instrument, providerConfig);
      return completed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failed = await this.importJobRepository.markFailed(jobId, message);
      this.logger.error(`Batched import job ${jobId} failed after ${completedBatches}/${totalBatches} batches: ${message}`);
      await this.publishImportEvent(FIP001_EVENTS.IMPORT_FAILED, failed, instrument, providerConfig, message);
      throw error;
    }
  }

  private async resolveAlias(instrumentId: string, providerId: string) {
    const aliases = await this.instrumentAliasRepository.findByInstrument(instrumentId);
    const alias = aliases.find((a) => a.providerId === providerId);
    if (!alias) {
      throw new NotFoundError("InstrumentAlias", `No alias exists mapping instrument ${instrumentId} to provider ${providerId} — register one before importing.`);
    }
    return alias;
  }

  /** The shared fetch → validate → dedupe → persist primitive for exactly one [from, to) range — used both by the original single-shot path and by runBatchedImport's per-batch loop. Never marks job status itself (the caller does, once, after all its own batches finish); does write candles + quality-issue rows for THIS range only, inside its own transaction. */
  private async runFetchValidatePersist(
    jobId: string,
    instrument: InstrumentModel,
    providerConfig: MarketDataProviderConfigModel,
    alias: { providerSymbol: string },
    interval: CandleInterval,
    from: Date,
    to: Date,
  ): Promise<BatchWriteResult> {
    const processingStartedAt = new Date();
    const response = await this.orchestration.executeWithRetry(providerConfig.type, (provider) => {
      if (!provider.historicalDataClient) {
        throw new ValidationError(`Provider "${providerConfig.type}" does not support historical data.`);
      }
      return provider.historicalDataClient.fetchCandles({
        providerSymbol: alias.providerSymbol,
        interval,
        from,
        to,
      });
    });

    const validCandles = [];
    let rejectedCount = 0;
    for (const candle of response.candles) {
      try {
        validateCandle(candle);
        validCandles.push(candle);
        await this.streamPublisher.publish(MARKET_DATA_STREAMS.CANDLE, FIP001_EVENTS.CANDLE_VALIDATED, {
          instrumentId: instrument.id,
          interval: candle.interval,
          eventTime: candle.eventTime,
        });
      } catch (error) {
        rejectedCount += 1;
        this.metrics.increment(`validation.candle.rejected`);
        await this.dataQualityIssueRepository.create({
          instrumentId: instrument.id,
          importJobId: jobId,
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
    if (duplicateFindings.length > 0) {
      this.metrics.increment(`validation.candle.duplicate`, duplicateFindings.length);
    }

    const persistedRows = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rows = [];
      for (const candle of toPersist) {
        const row = await this.candleRepository.upsert(
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
            importJobId: jobId,
          },
          tx,
        );
        rows.push(row);
      }
      return rows;
    });

    for (const row of persistedRows) {
      await this.streamPublisher.publish(MARKET_DATA_STREAMS.CANDLE, FIP001_EVENTS.CANDLE_RECEIVED, {
        instrumentId: instrument.id,
        interval: row.interval,
        eventTime: row.eventTime,
      });
      // Domain 6 (Quality Pipeline) — score every persisted candle. Deliberately
      // outside the persistence transaction: CandleQualityMetadata is a
      // recomputable second pass over an already-committed candle (this
      // module's own established rule — see that table's own schema
      // comment), not something a candle-write failure should ever roll
      // back or vice versa. A scoring failure here is logged, not thrown —
      // it must never fail an otherwise-successful import.
      try {
        await this.qualityScoringService.scoreImportedCandle({
          candleId: row.id,
          instrumentId: instrument.id,
          sourceProviderType: providerConfig.type,
          importTimestamp: new Date(),
          processingStartedAt,
          passedStructuralValidation: true,
          providerCircuitHealthy: this.orchestration.getCircuitState(providerConfig.type) === "closed",
        });
      } catch (error) {
        this.logger.warn(`Quality scoring failed for candle ${row.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { persisted: toPersist.length, rejected: rejectedCount };
  }

  private async publishImportEvent(
    eventName: string,
    job: DataImportJobModel,
    instrument: InstrumentModel,
    providerConfig: MarketDataProviderConfigModel,
    message?: string,
  ): Promise<void> {
    const payload = {
      jobId: job.id,
      instrumentId: instrument.id,
      providerType: providerConfig.type,
      status: job.status,
      recordsProcessed: job.recordsProcessed,
      recordsFailed: job.recordsFailed,
      ...(message ? { message } : {}),
    };
    this.eventPublisher.publish(eventName, payload);
    await this.streamPublisher.publish(MARKET_DATA_STREAMS.IMPORT, eventName, payload);
  }
}
