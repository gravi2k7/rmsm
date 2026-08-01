import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { ImportSchedulerService } from "../services/import-scheduler.service";

/** Registers a repeatable BullMQ "poll" job — same native-repeatable-job pattern as BillingCronRegistrar/NotificationCronRegistrar — that periodically calls ImportSchedulerService.pollAndEnqueueDueWork() to pick up due-scheduled, resumable, and retryable import jobs. The actual poll runs inside ImportPollProcessor (this phase), not here — this class only registers the repeatable trigger. */
@Injectable()
export class ImportCronRegistrar implements OnModuleInit {
  private readonly logger = new Logger(ImportCronRegistrar.name);

  constructor(@InjectQueue("market-data-import-poll") private readonly pollQueue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.pollQueue.add("poll-due-imports", {}, { repeat: { every: 60_000 }, jobId: "poll-due-imports-repeatable" });
    this.logger.log("Registered repeatable poll job: market-data import scheduler every 60s.");
  }
}
