import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { DigestService } from "../services/digest.service";

/** The "digest" queue only ever carries the periodic "sweep-digests" repeatable job (registered by NotificationCronRegistrar) — digests have no per-item enqueue path the way email/sms/push do, since DigestService builds and sends them directly when the sweep finds one due. */
@Processor("digest")
export class DigestQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(DigestQueueProcessor.name);

  constructor(private readonly digestService: DigestService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== "sweep-digests") {
      this.logger.warn(`Unexpected job name "${job.name}" on the digest queue — ignoring.`);
      return;
    }
    const result = await this.digestService.processDueDigests(new Date());
    this.logger.log(`Digest sweep: ${result.sent} sent, ${result.skipped} skipped.`);
  }
}
