import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { RenewalService } from "../services/renewal.service";

/** Consumes the "billing-renewal" queue's repeatable sweep job — see billing-cron.registrar.ts. */
@Processor("billing-renewal")
export class BillingRenewalProcessor extends WorkerHost {
  private readonly logger = new Logger(BillingRenewalProcessor.name);

  constructor(private readonly renewalService: RenewalService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    await this.renewalService.sweepTrialsEndingSoon();
    await this.renewalService.sweepExpiredLicenses();
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.warn(`Renewal sweep job ${job?.id} failed: ${error.message}`);
  }
}
