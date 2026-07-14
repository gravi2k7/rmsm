import type { CandleInterval } from "@rmsm/database";
import type { NormalizedCandle } from "../interfaces/normalized-market-data.interface";

/**
 * Detection-oriented data quality contracts — gap detection, duplicate
 * detection, out-of-order detection, invalid price/quantity detection,
 * and stale quote detection, grouped in one file since they share the
 * same shape (given data, produce a finding) and are typically run
 * together as one validation pass over an incoming batch. Workflow-
 * oriented contracts (backfill, manual correction, provider outage
 * classification, timezone/session validation) are in
 * workflow.contracts.ts instead — a deliberate split by "detects a
 * problem" vs. "does something about it," not an arbitrary one.
 *
 * Every contract here is a pure function shape: given data, return a
 * finding. Implementations (Phase 2+) turn a positive finding into a
 * DataQualityIssue or DataGap row; that persistence step is a service-
 * layer concern, not this contract's.
 */

export interface GapFinding {
  interval: CandleInterval;
  gapStart: Date;
  gapEnd: Date;
}

export interface GapDetector {
  /** existingCandles must be sorted ascending by eventTime — the contract doesn't sort defensively; that's the caller's job, kept out of this hot path deliberately. */
  detectGaps(existingCandles: Pick<NormalizedCandle, "eventTime">[], interval: CandleInterval, from: Date, to: Date): GapFinding[];
}

export interface DuplicateFinding {
  candle: NormalizedCandle;
  duplicateOf: NormalizedCandle;
}

export interface DuplicateDetector {
  detectDuplicates(candles: NormalizedCandle[]): DuplicateFinding[];
}

export interface OutOfOrderFinding {
  candle: NormalizedCandle;
  expectedAfter: NormalizedCandle;
}

export interface OutOfOrderDetector {
  /** candles as received, NOT pre-sorted — detecting out-of-order-ness requires seeing the actual arrival/write order, which sorting first would destroy. */
  detectOutOfOrder(candles: NormalizedCandle[]): OutOfOrderFinding[];
}

export interface InvalidValueFinding {
  candle: NormalizedCandle;
  reason: "negative_price" | "negative_volume" | "high_below_low" | "open_close_outside_range" | "zero_price";
}

export interface InvalidValueDetector {
  detectInvalidValues(candles: NormalizedCandle[]): InvalidValueFinding[];
}

export interface StaleQuoteFinding {
  instrumentId: string;
  lastEventTime: Date;
  staleForMs: number;
}

export interface StaleQuoteDetector {
  /** thresholdMs is deliberately a parameter, not a constant this contract owns — "stale" means something different for a crypto pair (trades 24/7) than for an equity outside market hours, and that judgment belongs to a caller who knows the instrument's trading session, not this detector. */
  detectStale(instrumentId: string, lastEventTime: Date, now: Date, thresholdMs: number): StaleQuoteFinding | null;
}
