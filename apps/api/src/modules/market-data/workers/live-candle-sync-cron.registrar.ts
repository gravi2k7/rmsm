import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

@Injectable()
export class LiveCandleSyncCronRegistrar implements OnModuleInit {
  private readonly logger = new Logger(
    LiveCandleSyncCronRegistrar.name,
  );

  constructor(
    @InjectQueue("market-data-candles")
    private readonly candleQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.candleQueue.add(
      "sync-live-candles",
      {},
      {
        repeat: { every: 60_000 },
        jobId: "sync-live-candles-repeatable",
      },
    );

    this.logger.log(
      "Registered repeatable live candle synchronization job every 60s.",
    );
  }
}
