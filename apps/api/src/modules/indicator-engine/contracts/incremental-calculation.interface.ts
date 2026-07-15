import type { IndicatorResultPoint } from "./indicator-result.interface";

/**
 * The 4 update kinds this phase's own spec names (item 9): new candle,
 * updated candle, historical correction, partial recalculation. Modeled
 * as a discriminated union — a real implementation (Phase 2+) branches
 * on `kind`, and TypeScript can verify every kind is actually handled
 * (exhaustiveness checking), not something achievable with 4 separate
 * loosely-related methods.
 */
export type IncrementalUpdateEvent =
  | { kind: "new_candle"; eventTime: Date }
  | { kind: "updated_candle"; eventTime: Date }
  /** Mirrors AI-101's own correction model exactly (ADR-022: a correction is a new row with supersedesId, never an in-place update) — this event kind exists specifically because a "corrected" candle is NOT the same as an "updated" one from AI-102's perspective: a correction can invalidate indicator values computed from the superseded row, potentially far forward in time (e.g. a moving average's entire subsequent window), which a plain "updated_candle" (still-forming live candle revision, no history-invalidating implications) does not. */
  | { kind: "historical_correction"; eventTime: Date; supersedesEventTime: Date }
  | { kind: "partial_recalculation"; from: Date; to: Date };

/**
 * What an indicator capable of incremental calculation
 * (`IndicatorDefinition.metadata` — see that interface's own header comment for the Phase 2A field restructuring) must implement
 * IN ADDITION TO `Indicator.calculate()` — a separate, optional
 * interface rather than folding this into the base `Indicator`
 * interface, since not every indicator can support it (a genuinely
 * stateful indicator needing its entire lookback window recomputed on
 * every update is a legitimate, honest design, not a deficiency).
 */
export interface IncrementalIndicator {
  /** Given the indicator's own previously-computed state (its own prior IndicatorResultPoint series) and one new event, produce only the new/changed points — never asked to recompute the full series. */
  applyIncrementalUpdate(previousPoints: IndicatorResultPoint[], event: IncrementalUpdateEvent): IndicatorResultPoint[];
}
