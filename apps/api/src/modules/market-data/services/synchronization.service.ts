import { Injectable } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import { MarketCandleRepository } from "../repositories/market-candle.repository";
import { HistoricalImportService } from "./historical-import.service";
import type { DataImportJobModel } from "../interfaces/models/operational.models";
import { candleIntervalToMs } from "../constants/candle-interval.constants";

export interface SynchronizationResult {
  synced: boolean;
  job?: DataImportJobModel;
  reason: string;
}

/**
 * The decision logic — "does this instrument need a sync right now, and
 * if so, for what range" — that a FUTURE scheduler (BullMQ repeatable
 * job, explicitly excluded this phase per "background schedulers beyond
 * orchestration") would call periodically. This service contains no
 * timer, no cron registration, no queue — `synchronizeInstrument()` is a
 * plain method a caller invokes once, synchronously, exactly like any
 * other service method. The orchestration this phase is scoped to is
 * "what happens on one sync attempt," not "when sync attempts happen."
 */
@Injectable()
export class SynchronizationService {
  constructor(
    private readonly candleRepository: MarketCandleRepository,
    private readonly historicalImportService: HistoricalImportService,
  ) {}

  async synchronizeInstrument(
    instrumentId: string,
    providerConfigId: string,
    interval: CandleInterval,
    actorId: string | null,
    now: Date = new Date(),
  ): Promise<SynchronizationResult> {
    const intervalMs = candleIntervalToMs(interval);
    const lookbackWindow = new Date(now.getTime() - intervalMs * 5);

    const recentCandles = await this.candleRepository.findRangeCurrentValues({
      instrumentId,
      interval,
      from: lookbackWindow,
      to: now,
      limit: 10,
    });

    const latestEventTime = recentCandles.length > 0 ? this.latestOf(recentCandles.map((c) => c.eventTime)) : null;
    const expectedLatestBy = new Date(now.getTime() - intervalMs);

    if (latestEventTime && latestEventTime.getTime() >= expectedLatestBy.getTime()) {
      return { synced: false, reason: "already up to date — latest persisted candle is within one interval of now" };
    }

    // No prior data: backfill a reasonable default window (10 intervals)
    // rather than the entire available history — a full historical
    // backfill is a deliberate, explicit operator action
    // (`HistoricalImportService.importHistoricalCandles` with a wide
    // `from`/`to`), not something a routine sync check should trigger on
    // its own for an instrument nobody has imported data for yet.
    const from = latestEventTime ?? new Date(now.getTime() - intervalMs * 10);

    const job = await this.historicalImportService.importHistoricalCandles(
      { instrumentId, providerConfigId, interval, from, to: now },
      actorId,
    );

    return { synced: true, job, reason: latestEventTime ? "caught up to the gap since the last known candle" : "no prior data — backfilled a default window" };
  }

  private latestOf(dates: Date[]): Date {
    return dates.reduce((latest, current) => (current.getTime() > latest.getTime() ? current : latest));
  }
}
