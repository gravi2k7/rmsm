import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

@Injectable()
export class CopyExecutionRecoveryCronRegistrar
  implements OnModuleInit
{
  private readonly logger = new Logger(
    CopyExecutionRecoveryCronRegistrar.name,
  );

  constructor(
    @InjectQueue("copy-execution-recovery")
    private readonly recoveryQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.recoveryQueue.add(
      "recover-stale-copy-executions",
      {},
      {
        repeat: {
          every: 30_000,
        },
        jobId: "recover-stale-copy-executions-repeatable",
      },
    );

    this.logger.log(
      "Registered repeatable copy-execution recovery job every 30s.",
    );
  }
}
