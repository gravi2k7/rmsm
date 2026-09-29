import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { BrokerSyncService } from "./broker-sync.service";

@Processor("broker-account-sync")
export class BrokerSyncQueueProcessor extends WorkerHost {
  constructor(
    private readonly brokerSyncService: BrokerSyncService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name !== "sync-broker-accounts") {
      return {
        skipped: true,
        reason: `Unknown job: ${job.name}`,
      };
    }

    return this.brokerSyncService.syncAllBrokerAccounts();
  }
}
