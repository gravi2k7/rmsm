import type { CandleInterval } from "@rmsm/database";

/**
 * The one piece of genuine logic in this phase's constants — every other
 * file in this module is types/interfaces with no runtime behavior
 * (Phase 1's explicit scope). Milliseconds-per-interval is pure,
 * deterministic domain knowledge every future phase needs (gap
 * detection's "is there a missing candle here" check, synchronization's
 * polling cadence, chart-rendering time-axis math) — real enough to be
 * worth a real implementation and a real test now, not deferred.
 */
export const CANDLE_INTERVAL_MS: Record<CandleInterval, number> = {
  ONE_MINUTE: 60_000,
  FIVE_MINUTES: 5 * 60_000,
  FIFTEEN_MINUTES: 15 * 60_000,
  THIRTY_MINUTES: 30 * 60_000,
  ONE_HOUR: 60 * 60_000,
  FOUR_HOURS: 4 * 60 * 60_000,
  ONE_DAY: 24 * 60 * 60_000,
  // ONE_WEEK/ONE_MONTH are calendar-relative, not fixed-duration (a
  // month is not a constant number of milliseconds) — approximated here
  // for gap-detection heuristics only; a future phase needing exact
  // calendar-aware month/week boundaries should NOT use this constant
  // for that purpose, and this comment says so rather than letting the
  // approximation pass as exact.
  ONE_WEEK: 7 * 24 * 60 * 60_000,
  ONE_MONTH: 30 * 24 * 60 * 60_000,
};

export function candleIntervalToMs(interval: CandleInterval): number {
  return CANDLE_INTERVAL_MS[interval];
}

/** Every CandleInterval ordered from smallest to largest — useful for a future phase's "find the next coarser timeframe" logic (e.g. resampling), not used by anything in this phase. */
export const CANDLE_INTERVALS_ASCENDING: CandleInterval[] = [
  "ONE_MINUTE",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "THIRTY_MINUTES",
  "ONE_HOUR",
  "FOUR_HOURS",
  "ONE_DAY",
  "ONE_WEEK",
  "ONE_MONTH",
];
