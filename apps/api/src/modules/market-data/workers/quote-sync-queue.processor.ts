import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { InstrumentStatus } from "@rmsm/database";
import { InstrumentRepository } from "../repositories/instrument.repository";
import { QuoteSynchronizationService } from "../services/quote-synchronization.service";

@Processor("market-data-quotes")
export class QuoteSyncQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QuoteSyncQueueProcessor.name);

  constructor(
    private readonly instrumentRepository: InstrumentRepository,
    private readonly quoteSynchronizationService: QuoteSynchronizationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== "sync-live-quotes") {
      this.logger.warn(
        `Unexpected job name "${job.name}" on market-data-quotes queue — ignoring.`,
      );
      return;
    }

    const instruments = await this.instrumentRepository.search(
      { status: InstrumentStatus.ACTIVE },
      { take: 1000, skip: 0 },
    );

    let synchronized = 0;
    let failed = 0;

    for (const instrument of instruments) {
      try {
        await this.quoteSynchronizationService.synchronizeInstrument(
          instrument.id,
        );

        synchronized += 1;
      } catch (error) {
        failed += 1;

        const message =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Live quote synchronization failed for ${instrument.symbol}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Live quote sweep completed: ${synchronized} synchronized, ${failed} failed.`,
    );
  }
}
