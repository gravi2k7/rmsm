import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

@Injectable()
export class GapRepairCronRegistrar implements OnModuleInit {
  private readonly logger = new Logger(GapRepairCronRegistrar.name);

  constructor(
    @InjectQueue("market-data-gap-repair")
    private readonly gapQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.gapQueue.add(
      "detect-and-repair-gaps",
      {},
      {
        repeat: {
          every: 60_000,
        },
        jobId: "detect-and-repair-gaps-repeatable",
      },
    );

    this.logger.log(
      "Registered repeatable market-data gap detection/repair job every 60s.",
    );
  }
}
