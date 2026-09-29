import { Injectable, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { CopyExecutionRecoveryService } from "./copy-execution-recovery.service";

@Processor("copy-execution-recovery")
@Injectable()
export class CopyExecutionRecoveryQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(
    CopyExecutionRecoveryQueueProcessor.name,
  );

  constructor(
    private readonly recoveryService: CopyExecutionRecoveryService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== "recover-stale-copy-executions") {
      this.logger.warn(
        `Unexpected job name "${job.name}" on copy-execution-recovery queue — ignoring.`,
      );
      return;
    }

    await this.recoveryService.recoverStaleSentExecutions();
  }
}
