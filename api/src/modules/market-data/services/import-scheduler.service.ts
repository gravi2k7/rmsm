import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import type { CandleInterval } from "@rmsm/database";
import { DataImportJobRepository } from "../repositories/data-import-job.repository";
import type { DataImportJobModel } from "../interfaces/models/operational.models";

const MAX_RETRIES = 3;

export interface CreateScheduledImportInput {
  instrumentId: string;
  providerConfigId: string;
  interval: CandleInterval;
  from: Date;
  to: Date;
  isIncremental?: boolean;
  priority?: number;
  scheduledFor?: Date;
}

/**
 * FIP-001 Domain 3 "Import scheduler". Owns job CREATION and QUEUEING
 * only — `HistoricalImportService.runBatchedImport()` (this phase) owns
 * actual execution, invoked by `ImportSchedulerProcessor` (this phase)
 * consuming the `market-data-import` BullMQ queue. Same
 * create-then-enqueue split as every other queue-backed service in this
 * codebase (e.g. Module 005's `WebhookService`/`WebhookRetryProcessor`).
 */
@Injectable()
export class ImportSchedulerService {
  private readonly logger = new Logger(ImportSchedulerService.name);

  constructor(
    private readonly importJobRepository: DataImportJobRepository,
    @InjectQueue("market-data-import") private readonly importQueue: Queue,
  ) {}

  async scheduleImport(input: CreateScheduledImportInput, providerId: string): Promise<DataImportJobModel> {
    const job = await this.importJobRepository.create({
      providerId,
      jobType: "historical_backfill",
      instrumentId: input.instrumentId,
      interval: input.interval,
      dateRangeStart: input.from,
      dateRangeEnd: input.to,
      isIncremental: input.isIncremental ?? false,
      priority: input.priority ?? 100,
      scheduledFor: input.scheduledFor,
    });
    await this.enqueue(job.id, input.scheduledFor);
    return job;
  }

  /** Resumes an interrupted RUNNING job — re-enqueues the same jobId; HistoricalImportService.runBatchedImport() itself reads resumeCursor to pick up where it left off. */
  async resumeImport(jobId: string): Promise<void> {
    await this.enqueue(jobId);
  }

  /** Domain 3 "Retry failed batches" — spawns a child job from a FAILED parent (under the retry ceiling) and enqueues it. */
  async retryImport(jobId: string): Promise<DataImportJobModel> {
    const parent = await this.importJobRepository.findById(jobId);
    if (!parent) throw new Error(`Import job ${jobId} not found.`);
    if (parent.retryCount >= MAX_RETRIES) {
      throw new Error(`Import job ${jobId} has already been retried ${parent.retryCount} times (max ${MAX_RETRIES}) — not retrying again.`);
    }
    const retryJob = await this.importJobRepository.createRetryJob(parent);
    await this.enqueue(retryJob.id);
    return retryJob;
  }

  /** Polled by ImportCronRegistrar — due-scheduled PENDING jobs plus interrupted RUNNING jobs that made partial progress, each enqueued for ImportSchedulerProcessor to pick up. */
  async pollAndEnqueueDueWork(now: Date = new Date()): Promise<number> {
    const due = await this.importJobRepository.findDueForScheduling(now, 50);
    const resumable = await this.importJobRepository.findResumable();
    const retryable = await this.importJobRepository.findRetryable(MAX_RETRIES);

    let enqueued = 0;
    for (const job of due) {
      await this.enqueue(job.id);
      enqueued += 1;
    }
    for (const job of resumable) {
      await this.enqueue(job.id);
      enqueued += 1;
    }
    for (const job of retryable) {
      try {
        await this.retryImport(job.id);
        enqueued += 1;
      } catch (error) {
        this.logger.warn(`Skipping retry for job ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return enqueued;
  }

  private async enqueue(jobId: string, scheduledFor?: Date): Promise<void> {
    const delay = scheduledFor ? Math.max(0, scheduledFor.getTime() - Date.now()) : 0;
    await this.importQueue.add("run-import", { jobId }, { jobId: `import-${jobId}-${Date.now()}`, delay, attempts: 1 });
  }
}
