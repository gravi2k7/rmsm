import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { ImportSchedulerService } from "../services/import-scheduler.service";

/** Consumes the "market-data-import-poll" queue's repeatable trigger (see ImportCronRegistrar) and delegates to ImportSchedulerService.pollAndEnqueueDueWork(). */
@Processor("market-data-import-poll")
export class ImportPollProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportPollProcessor.name);

  constructor(private readonly schedulerService: ImportSchedulerService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const count = await this.schedulerService.pollAndEnqueueDueWork();
    if (count > 0) this.logger.log(`Enqueued ${count} import job(s) this poll cycle.`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.warn(`Import poll job ${job?.id} failed: ${error.message}`);
  }
}
