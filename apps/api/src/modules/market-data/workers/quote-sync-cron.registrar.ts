import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

@Injectable()
export class QuoteSyncCronRegistrar implements OnModuleInit {
  private readonly logger = new Logger(QuoteSyncCronRegistrar.name);

  constructor(
    @InjectQueue("market-data-quotes")
    private readonly quoteQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.quoteQueue.add(
      "sync-live-quotes",
      {},
      {
        repeat: { every: 60_000 },
        jobId: "sync-live-quotes-repeatable",
      },
    );

    this.logger.log(
      "Registered repeatable live quote synchronization job every 60s.",
    );
  }
}
