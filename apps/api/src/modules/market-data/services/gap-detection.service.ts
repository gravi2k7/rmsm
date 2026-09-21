import { Injectable } from "@nestjs/common";
import { CandleInterval } from "@rmsm/database";
import type {
  GapDetector,
  GapFinding,
} from "../contracts/detection.contracts";
import { candleIntervalToMs } from "../constants/candle-interval.constants";

/**
 * Pure interval continuity detector.
 *
 * It deliberately does not know about trading calendars. Session/calendar
 * filtering belongs to a caller that has exchange/session context.
 */
@Injectable()
export class GapDetectionService implements GapDetector {
  detectGaps(
    existingCandles: Array<{ eventTime: Date }>,
    interval: CandleInterval,
    from: Date,
    to: Date,
  ): GapFinding[] {
    if (from >= to) {
      return [];
    }

    const intervalMs = candleIntervalToMs(interval);
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      return [];
    }

    const times = [...existingCandles]
      .map((candle) => candle.eventTime.getTime())
      .filter((time) => Number.isFinite(time))
      .sort((a, b) => a - b);

    const uniqueTimes = [...new Set(times)];

    const expectedStart = Math.ceil(from.getTime() / intervalMs) * intervalMs;
    const expectedEnd =
      Math.floor(to.getTime() / intervalMs) * intervalMs;

    if (expectedStart > expectedEnd) {
      return [];
    }

    const existing = new Set(uniqueTimes);

    const findings: GapFinding[] = [];
    let gapStart: number | null = null;
    let previousExpected: number | null = null;

    for (
      let expected = expectedStart;
      expected <= expectedEnd;
      expected += intervalMs
    ) {
      if (existing.has(expected)) {
        if (gapStart !== null && previousExpected !== null) {
          findings.push({
            interval,
            gapStart: new Date(gapStart),
            gapEnd: new Date(previousExpected),
          });
          gapStart = null;
        }
      } else if (gapStart === null) {
        gapStart = expected;
      }

      previousExpected = expected;
    }

    if (gapStart !== null && previousExpected !== null) {
      findings.push({
        interval,
        gapStart: new Date(gapStart),
        gapEnd: new Date(previousExpected),
      });
    }

    return findings;
  }
}
