import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

@Injectable()
export class BrokerSyncCronRegistrar implements OnModuleInit {
  constructor(
    @InjectQueue("broker-account-sync")
    private readonly brokerSyncQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.brokerSyncQueue.add(
      "sync-broker-accounts",
      {},
      {
        repeat: {
          every: 30_000,
        },
        jobId: "sync-broker-accounts-repeatable",
      },
    );
  }
}
