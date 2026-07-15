/**
 * The explicitly recommended addition this phase's own prompt named —
 * "it will become very useful later." 6 modes, covering both this
 * phase's own item 3 list (full/incremental/rolling/historical replay)
 * and the two live-market modes (LIVE_TICK/LIVE_BAR) and BACKTEST that
 * the recommendation's own worked example names beyond item 3's
 * original 4 — included now because the recommendation asked for them
 * explicitly, not because this phase implements tick-level or backtest
 * execution (it doesn't; this is metadata only, per item 3's own "no
 * calculations").
 */
export type CalculationMode = "FULL_RECALCULATION" | "INCREMENTAL" | "HISTORICAL_REPLAY" | "LIVE_TICK" | "LIVE_BAR" | "BACKTEST";

/**
 * Calculation window model (item 3) — metadata describing WHAT RANGE and
 * HOW an execution should compute over, not the computation itself. The
 * computation engine (this phase's real implementation) reads this to
 * decide how much candle history to fetch from AI-101 and whether to
 * call an indicator's full `calculate()` or (Phase 2C+, once
 * `IncrementalIndicator` implementations exist) its incremental path —
 * this contract only describes the request, the actual branching logic
 * belongs to `ComputationEngine`.
 */
export interface CalculationWindow {
  mode: CalculationMode;
  /** The range the caller actually wants results for — the engine internally extends this backward to cover the indicator's own `minimumLookback` before fetching (Phase 1's `IndicatorExecutionRequest` established this same "caller names the target range, the engine handles the lookback padding" split; carried forward unchanged). */
  from: Date;
  to: Date;
  /**
   * For `INCREMENTAL` mode only — the specific event this calculation is
   * reacting to (mirrors AI-101 Phase 2C's own
   * `IncrementalUpdateEvent` discriminated union exactly, reused here
   * rather than redeclared, since an indicator's incremental update and
   * AI-101's own candle-level incremental update are the same real-world
   * event, just consumed by a different layer). Undefined for every
   * other mode.
   */
  incrementalEvent?: {
    kind: "new_candle" | "updated_candle" | "historical_correction" | "partial_recalculation";
    eventTime: Date;
  };
}
