import type { IndicatorTimeframe } from "./timeframe";
import type { IndicatorResult } from "./indicator-result.interface";

/**
 * One request to run an indicator through the FULL engine (dependency
 * resolution, candle-fetching from AI-101, lookback calculation, then
 * calling the indicator's own `calculate()`) — distinct from
 * `Indicator.calculate()` itself, which is the pure, already-resolved
 * per-indicator function. `IndicatorExecutionRequest` is what a caller
 * (a future AI-103+ module, or an internal scheduler) actually submits;
 * `Indicator.calculate()` is an internal implementation detail the
 * engine invokes once everything that request needs has been resolved.
 */
export interface IndicatorExecutionRequest {
  indicatorIdentifier: string;
  instrumentId: string;
  timeframe: IndicatorTimeframe;
  parameters: Record<string, number | string | boolean>;
  /** The range the caller actually wants results for — the engine internally fetches further back to cover `requiredLookback` before this, per IndicatorContext's own comment; the caller never has to calculate that extra range itself. */
  from: Date;
  to: Date;
  /** Explicit opt-in to incremental calculation (item 9) — false forces a full recalculation over the entire requested range even if the indicator supports incremental updates, useful for a caller that suspects its cached state is stale (e.g. after a historical correction, AI-101's ADR-022). */
  allowIncremental: boolean;
}

export interface IndicatorExecutionResult {
  request: IndicatorExecutionRequest;
  result: IndicatorResult;
  /** How long the actual calculation took — the concrete hook Phase 5-equivalent observability work (matching AI-101's own precedent) will read from, not decided or implemented this phase. */
  durationMs: number;
  /** Whether this execution actually ran an incremental update vs. a full recalculation — surfaced back to the caller since "did my incremental-calculation assumption actually get used" is a real, useful thing to know, not an internal detail worth hiding. */
  wasIncremental: boolean;
}
