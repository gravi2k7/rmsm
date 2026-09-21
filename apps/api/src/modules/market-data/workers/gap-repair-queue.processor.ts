import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import {
  CandleInterval,
  DataGapStatus,
  InstrumentStatus,
} from "@rmsm/database";
import { InstrumentRepository } from "../repositories/instrument.repository";
import { MarketCandleRepository } from "../repositories/market-candle.repository";
import { DataGapRepository } from "../repositories/data-gap.repository";
import { GapDetectionService } from "../services/gap-detection.service";
import { BackfillWorkflowService } from "../services/backfill-workflow.service";
import { CandleAggregationService } from "../services/candle-aggregation.service";
import { CTraderTradingScheduleService } from "../providers/ctrader/openapi/ctrader-trading-schedule.service";
import { candleIntervalToMs } from "../constants/candle-interval.constants";

@Processor("market-data-gap-repair")
export class GapRepairQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(GapRepairQueueProcessor.name);

  private static readonly LOOKBACK_MS = 2 * 60 * 60 * 1000;
  private static readonly MAX_GAPS_PER_SWEEP = 100;

  /**
   * These intervals have unambiguous fixed-duration boundaries when derived
   * from canonical 1-minute candles.
   *
   * ONE_DAY/WEEK/MONTH are deliberately excluded because their boundaries
   * require calendar/session semantics rather than fixed-minute arithmetic.
   */
  private static readonly DERIVED_INTERVALS: CandleInterval[] = [
    CandleInterval.FIVE_MINUTES,
    CandleInterval.FIFTEEN_MINUTES,
    CandleInterval.THIRTY_MINUTES,
    CandleInterval.ONE_HOUR,
    CandleInterval.FOUR_HOURS,
  ];

  constructor(
    private readonly instrumentRepository: InstrumentRepository,
    private readonly candleRepository: MarketCandleRepository,
    private readonly dataGapRepository: DataGapRepository,
    private readonly gapDetectionService: GapDetectionService,
    private readonly backfillWorkflow: BackfillWorkflowService,
    private readonly candleAggregationService: CandleAggregationService,
    private readonly tradingScheduleService: CTraderTradingScheduleService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== "detect-and-repair-gaps") {
      this.logger.warn(
        `Unexpected job name "${job.name}" on market-data-gap-repair queue — ignoring.`,
      );
      return;
    }

    const instruments = await this.instrumentRepository.search(
      { status: InstrumentStatus.ACTIVE },
      { take: 1000, skip: 0 },
    );

    let detected = 0;
    let repaired = 0;
    let unresolved = 0;

    for (const instrument of instruments) {
      try {
        /*
         * Repair the canonical 1-minute source first. Higher timeframes
         * depend on complete 1-minute coverage.
         */
        const oneMinuteResult = await this.scanInstrument(
          instrument.id,
          CandleInterval.ONE_MINUTE,
        );

        detected += oneMinuteResult.detected;
        repaired += oneMinuteResult.repaired;
        unresolved += oneMinuteResult.unresolved;

        /*
         * Only after the 1-minute sweep has completed do we derive missing
         * higher-timeframe candles from those canonical 1-minute candles.
         */
        for (const interval of GapRepairQueueProcessor.DERIVED_INTERVALS) {
          const result = await this.scanDerivedInterval(
            instrument.id,
            interval,
          );

          detected += result.detected;
          repaired += result.repaired;
          unresolved += result.unresolved;
        }
      } catch (error) {
        this.logger.error(
          `Gap sweep failed for ${instrument.symbol}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(
      `Gap sweep completed: ${detected} gap(s) detected, ${repaired} repaired, ${unresolved} unresolved.`,
    );
  }

  private async scanInstrument(
    instrumentId: string,
    interval: CandleInterval,
  ): Promise<{
    detected: number;
    repaired: number;
    unresolved: number;
  }> {
    const intervalMs = candleIntervalToMs(interval);
    const now = new Date();

    // Do not inspect the currently-forming candle.
    /*
     * Give the live candle pipeline one completed-candle grace period.
     * The live candle can be persisted a few seconds after its bucket closes;
     * scanning the immediately previous bucket creates transient false gaps.
     */
    const to = new Date(
      Math.floor(now.getTime() / intervalMs) * intervalMs -
        2 * intervalMs,
    );
    const from = new Date(
      to.getTime() - GapRepairQueueProcessor.LOOKBACK_MS,
    );

    const candles = await this.candleRepository.findRangeCurrentValues({
      instrumentId,
      interval,
      from,
      to,
      limit: 10_000,
    });

    const findings =
      await this.detectSessionAwareGaps(
        instrumentId,
        candles,
        interval,
        from,
        to,
      );

    let detected = 0;
    let repaired = 0;
    let unresolved = 0;

    for (const finding of findings.slice(
      0,
      GapRepairQueueProcessor.MAX_GAPS_PER_SWEEP,
    )) {
      const overlapping =
        await this.dataGapRepository.findOverlapping({
          instrumentId,
          interval,
          gapStart: finding.gapStart,
          gapEnd: finding.gapEnd,
          statuses: [
            DataGapStatus.DETECTED,
            DataGapStatus.BACKFILLING,
            DataGapStatus.UNRESOLVED,
          ],
        });

      if (overlapping.length > 0) {
        continue;
      }

      const gap = await this.dataGapRepository.create({
        instrumentId,
        interval,
        gapStart: finding.gapStart,
        gapEnd: finding.gapEnd,
      });

      detected += 1;

      const result = await this.backfillWorkflow.execute({
        instrumentId,
        gapId: gap.id,
      });

      if (result.succeeded) {
        repaired += 1;
      } else {
        unresolved += 1;
      }
    }

    return {
      detected,
      repaired,
      unresolved,
    };
  }

  /**
   * Runs the existing pure gap detector only across contiguous trading
   * periods. Closed cTrader sessions must not become artificial candle gaps.
   *
   * If cTrader schedule metadata is unavailable, the schedule service
   * deliberately fails open and this method scans the complete range.
   */
  private async detectSessionAwareGaps(
    instrumentId: string,
    candles: Awaited<
      ReturnType<MarketCandleRepository["findRangeCurrentValues"]>
    >,
    interval: CandleInterval,
    from: Date,
    to: Date,
  ) {
    const schedule =
      await this.tradingScheduleService.getScheduleForInstrument(
        instrumentId,
      );

    if (!schedule) {
      return this.gapDetectionService.detectGaps(
        candles,
        interval,
        from,
        to,
      );
    }

    const intervalMs = candleIntervalToMs(interval);
    const findings = [];

    let segmentStart: Date | null = null;

    for (
      let timestamp = from.getTime();
      timestamp <= to.getTime();
      timestamp += intervalMs
    ) {
      const current = new Date(timestamp);
      const trading =
        this.tradingScheduleService.isTradingTime(
          current,
          schedule,
        );

      if (trading && segmentStart === null) {
        segmentStart = current;
        continue;
      }

      if (!trading && segmentStart !== null) {
        const segmentEnd = new Date(
          timestamp - intervalMs,
        );

        if (segmentEnd.getTime() >= segmentStart.getTime()) {
          findings.push(
            ...this.gapDetectionService.detectGaps(
              candles,
              interval,
              segmentStart,
              segmentEnd,
            ),
          );
        }

        segmentStart = null;
      }
    }

    if (segmentStart !== null) {
      findings.push(
        ...this.gapDetectionService.detectGaps(
          candles,
          interval,
          segmentStart,
          to,
        ),
      );
    }

    return findings;
  }

  private async ensureOneMinuteCoverage(
    instrumentId: string,
    from: Date,
    to: Date,
  ): Promise<boolean> {
    const intervalMs = candleIntervalToMs(
      CandleInterval.ONE_MINUTE,
    );

    const schedule =
      await this.tradingScheduleService.getScheduleForInstrument(
        instrumentId,
      );

    const candles =
      await this.candleRepository.findRangeCurrentValues({
        instrumentId,
        interval: CandleInterval.ONE_MINUTE,
        from,
        to,
        limit: 10_000,
      });

    const existing = new Set(
      candles.map((candle) => candle.eventTime.getTime()),
    );

    const expectedTimestamps: number[] = [];

    for (
      let timestamp = from.getTime();
      timestamp <= to.getTime();
      timestamp += intervalMs
    ) {
      const trading =
        !schedule ||
        this.tradingScheduleService.isTradingTime(
          new Date(timestamp),
          schedule,
        );

      if (trading) {
        expectedTimestamps.push(timestamp);
      }
    }

    if (
      expectedTimestamps.every((timestamp) =>
        existing.has(timestamp),
      )
    ) {
      return true;
    }

    let missingStart: number | null = null;
    let previousMissing: number | null = null;

    for (const timestamp of expectedTimestamps) {
      if (!existing.has(timestamp)) {
        if (missingStart === null) {
          missingStart = timestamp;
        }

        previousMissing = timestamp;
        continue;
      }

      if (missingStart !== null && previousMissing !== null) {
        await this.repairOneMinuteGap(
          instrumentId,
          new Date(missingStart),
          new Date(previousMissing),
        );

        missingStart = null;
        previousMissing = null;
      }
    }

    if (missingStart !== null && previousMissing !== null) {
      await this.repairOneMinuteGap(
        instrumentId,
        new Date(missingStart),
        new Date(previousMissing),
      );
    }

    const repaired =
      await this.candleRepository.findRangeCurrentValues({
        instrumentId,
        interval: CandleInterval.ONE_MINUTE,
        from,
        to,
        limit: 10_000,
      });

    const repairedSet = new Set(
      repaired.map((candle) => candle.eventTime.getTime()),
    );

    return expectedTimestamps.every((timestamp) =>
      repairedSet.has(timestamp),
    );
  }

  private async repairOneMinuteGap(
    instrumentId: string,
    gapStart: Date,
    gapEnd: Date,
  ): Promise<boolean> {
    const overlapping = await this.dataGapRepository.findOverlapping({
      instrumentId,
      interval: CandleInterval.ONE_MINUTE,
      gapStart,
      gapEnd,
      statuses: [
        DataGapStatus.DETECTED,
        DataGapStatus.BACKFILLING,
        DataGapStatus.UNRESOLVED,
      ],
    });

    if (overlapping.length > 0) {
      for (const existing of overlapping) {
        if (existing.status === DataGapStatus.UNRESOLVED) {
          await this.dataGapRepository.markStatus(
            existing.id,
            DataGapStatus.DETECTED,
          );
        }

        const result = await this.backfillWorkflow.execute({
          instrumentId,
          gapId: existing.id,
        });

        if (!result.succeeded) {
          return false;
        }
      }

      return true;
    }

    const gap = await this.dataGapRepository.create({
      instrumentId,
      interval: CandleInterval.ONE_MINUTE,
      gapStart,
      gapEnd,
    });

    const result = await this.backfillWorkflow.execute({
      instrumentId,
      gapId: gap.id,
    });

    return result.succeeded;
  }

  private async scanDerivedInterval(
    instrumentId: string,
    interval: CandleInterval,
  ): Promise<{
    detected: number;
    repaired: number;
    unresolved: number;
  }> {
    const intervalMs = candleIntervalToMs(interval);
    const now = new Date();

    // Do not inspect the currently-forming higher-timeframe candle.
    const to = new Date(
      Math.floor(now.getTime() / intervalMs) * intervalMs - intervalMs,
    );
    const from = new Date(
      to.getTime() - GapRepairQueueProcessor.LOOKBACK_MS,
    );

    const candles = await this.candleRepository.findRangeCurrentValues({
      instrumentId,
      interval,
      from,
      to,
      limit: 10_000,
    });

    const findings =
      await this.detectSessionAwareGaps(
        instrumentId,
        candles,
        interval,
        from,
        to,
      );

    let detected = 0;
    let repaired = 0;
    let unresolved = 0;

    for (const finding of findings.slice(
      0,
      GapRepairQueueProcessor.MAX_GAPS_PER_SWEEP,
    )) {
      const overlapping =
        await this.dataGapRepository.findOverlapping({
          instrumentId,
          interval,
          gapStart: finding.gapStart,
          gapEnd: finding.gapEnd,
          statuses: [
            DataGapStatus.DETECTED,
            DataGapStatus.BACKFILLING,
            DataGapStatus.UNRESOLVED,
          ],
        });

      if (overlapping.length > 0) {
        continue;
      }

      const gap = await this.dataGapRepository.create({
        instrumentId,
        interval,
        gapStart: finding.gapStart,
        gapEnd: finding.gapEnd,
      });

      detected += 1;

      try {
        await this.dataGapRepository.incrementRepairAttempts(gap.id);
        await this.dataGapRepository.markStatus(
          gap.id,
          DataGapStatus.BACKFILLING,
        );

        const sourceFrom = finding.gapStart;
        const sourceTo = new Date(
          finding.gapEnd.getTime() + intervalMs - 1,
        );

        const coverageReady = await this.ensureOneMinuteCoverage(
          instrumentId,
          sourceFrom,
          sourceTo,
        );

        if (!coverageReady) {
          await this.dataGapRepository.markStatus(
            gap.id,
            DataGapStatus.UNRESOLVED,
          );

          unresolved += 1;

          this.logger.warn(
            `Cannot aggregate ${interval} gap ${gap.id}: ` +
              `required one-minute source coverage could not be repaired.`,
          );

          continue;
        }

        const sourceCandles =
          await this.candleRepository.findRangeCurrentValues({
            instrumentId,
            interval: CandleInterval.ONE_MINUTE,
            from: sourceFrom,
            to: sourceTo,
            limit: 10_000,
          });

        const aggregated =
          this.candleAggregationService.aggregateFromOneMinute(
            sourceCandles,
            interval,
            finding.gapStart,
          );

        if (!aggregated) {
          await this.dataGapRepository.markStatus(
            gap.id,
            DataGapStatus.UNRESOLVED,
          );

          unresolved += 1;

          this.logger.warn(
            `Cannot aggregate ${interval} gap ${gap.id}: ` +
              `1-minute source coverage is incomplete or inconsistent.`,
          );

          continue;
        }

        await this.candleRepository.upsertBackfill({
          instrumentId,
          interval: aggregated.interval,
          eventTime: aggregated.eventTime,
          open: aggregated.open,
          high: aggregated.high,
          low: aggregated.low,
          close: aggregated.close,
          volume: aggregated.volume,
          providerId: aggregated.providerId,
          sourceTimestamp: aggregated.sourceTimestamp,
        });

        await this.dataGapRepository.markStatus(
          gap.id,
          DataGapStatus.RESOLVED,
        );

        repaired += 1;

        this.logger.log(
          `Aggregated ${interval} candle for ${instrumentId} ` +
            `at ${finding.gapStart.toISOString()} from ` +
            `${sourceCandles.length} one-minute candles.`,
        );
      } catch (error) {
        await this.dataGapRepository.markStatus(
          gap.id,
          DataGapStatus.UNRESOLVED,
        );

        unresolved += 1;

        this.logger.warn(
          `Higher-timeframe gap ${gap.id} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      detected,
      repaired,
      unresolved,
    };
  }
}
