import { Injectable, Logger } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import { MarketCandleRepository } from "../repositories/market-candle.repository";
import { DataGapRepository } from "../repositories/data-gap.repository";
import type { DataGapModel } from "../interfaces/models/operational.models";
import { candleIntervalToMs } from "../constants/candle-interval.constants";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { MarketDataStreamPublisherService, MARKET_DATA_STREAMS } from "./market-data-stream-publisher.service";
import { FIP001_EVENTS } from "../../../common/events/fip001-events";

export interface DetectGapsOptions {
  /**
   * Whether an entirely-weekend missing span (Sat 00:00 through the
   * following Mon's session open) should be treated as expected
   * non-trading time rather than a real gap — true by default for
   * traditional-market instruments (equities, most FX brokers' weekend
   * close). Crypto instruments, which trade 24/7, should pass `false`.
   * This is a documented heuristic, not full trading-calendar/holiday
   * awareness — a real gap detector eventually needs the existing
   * `TradingSession`/exchange-calendar data for full accuracy; this is a
   * genuine, useful first pass that avoids the single most common false
   * positive (every Friday-close-to-Monday-open gap) without requiring
   * that larger holiday-calendar integration to already exist.
   */
  respectWeekends?: boolean;
  /** How many missed intervals in a row before it counts as a gap worth recording, guarding against normal single-candle jitter. Default 2. */
  toleranceIntervals?: number;
}

/**
 * FIP-001 Domain 7 (Gap Detection). Scans persisted candles for an
 * instrument/interval over [from, to) and records a `DataGap` row for
 * every span of missing candles that exceeds tolerance. Duplicate
 * candles (the other thing Domain 7 lists) are already handled at
 * import time by the existing `duplicate-detector.ts` — this service
 * does not re-detect them.
 */
@Injectable()
export class GapDetectionService {
  private readonly logger = new Logger(GapDetectionService.name);

  constructor(
    private readonly candleRepository: MarketCandleRepository,
    private readonly gapRepository: DataGapRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly streamPublisher: MarketDataStreamPublisherService,
  ) {}

  async detectGaps(
    instrumentId: string,
    interval: CandleInterval,
    from: Date,
    to: Date,
    options: DetectGapsOptions = {},
  ): Promise<DataGapModel[]> {
    const respectWeekends = options.respectWeekends ?? true;
    const toleranceIntervals = options.toleranceIntervals ?? 2;
    const intervalMs = candleIntervalToMs(interval);

    const candles = await this.candleRepository.findRangeCurrentValues({ instrumentId, interval, from, to, limit: 100_000 });
    const sorted = [...candles].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());

    const created: DataGapModel[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1]!.eventTime;
      const current = sorted[i]!.eventTime;
      const deltaMs = current.getTime() - previous.getTime();
      if (deltaMs <= intervalMs * toleranceIntervals) continue;

      const gapStart = new Date(previous.getTime() + intervalMs);
      const gapEnd = current;

      if (respectWeekends && this.isEntirelyWeekend(gapStart, gapEnd)) continue;

      const overlapping = await this.gapRepository.findOverlapping(instrumentId, interval, gapStart, gapEnd);
      if (overlapping.length > 0) continue;

      const gap = await this.gapRepository.create({ instrumentId, interval, gapStart, gapEnd });
      created.push(gap);

      const payload = { gapId: gap.id, instrumentId, interval, gapStart: gapStart.toISOString(), gapEnd: gapEnd.toISOString() };
      this.eventPublisher.publish(FIP001_EVENTS.GAP_DETECTED, payload);
      await this.streamPublisher.publish(MARKET_DATA_STREAMS.GAP, FIP001_EVENTS.GAP_DETECTED, payload);
    }

    this.logger.log(`Gap scan for instrument ${instrumentId}/${interval} over [${from.toISOString()}, ${to.toISOString()}): ${created.length} new gap(s) recorded.`);
    return created;
  }

  /** True only if [start, end) never touches a weekday session — i.e. it starts on/after Saturday 00:00 and ends on/before the following Monday 00:00. Anything crossing into a weekday is treated as a real gap even if it also spans a weekend. */
  private isEntirelyWeekend(start: Date, end: Date): boolean {
    const startDay = start.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const endDay = end.getUTCDay();
    const spanMs = end.getTime() - start.getTime();
    const startsOnWeekend = startDay === 0 || startDay === 6;
    const endsByMonday = endDay === 1 || endDay === 0 || endDay === 6;
    return startsOnWeekend && endsByMonday && spanMs <= 3 * 24 * 60 * 60_000;
  }
}
