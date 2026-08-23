import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { InstrumentStatus } from "@rmsm/database";
import { InstrumentRepository } from "../repositories/instrument.repository";
import { LiveCandleSynchronizationService } from "../services/live-candle-synchronization.service";

@Processor("market-data-candles")
export class LiveCandleSyncQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(
    LiveCandleSyncQueueProcessor.name,
  );

  constructor(
    private readonly instrumentRepository: InstrumentRepository,
    private readonly liveCandleSynchronizationService: LiveCandleSynchronizationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== "sync-live-candles") {
      this.logger.warn(
        `Unexpected job name "${job.name}" on market-data-candles queue — ignoring.`,
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
        const result =
          await this.liveCandleSynchronizationService.synchronizeInstrument(
            instrument.id,
          );

        synchronized += result.persisted;
      } catch (error) {
        failed += 1;

        const message =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Live candle synchronization failed for ${instrument.symbol}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Live candle sweep completed: ${synchronized} candle(s) synchronized, ${failed} instrument(s) failed.`,
    );
  }
}
