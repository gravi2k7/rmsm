import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { HistoricalImportService } from "../services/historical-import.service";

interface RunImportJobData {
  jobId: string;
}

/** Consumes the "market-data-import" queue — one BullMQ job per DataImportJob execution/resume/retry attempt, enqueued by ImportSchedulerService. */
@Processor("market-data-import")
export class ImportSchedulerProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportSchedulerProcessor.name);

  constructor(private readonly historicalImportService: HistoricalImportService) {
    super();
  }

  async process(job: Job<RunImportJobData>): Promise<void> {
    await this.historicalImportService.runBatchedImport(job.data.jobId);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<RunImportJobData> | undefined, error: Error): void {
    this.logger.warn(`Import job ${job?.data.jobId} failed: ${error.message}`);
  }
}
