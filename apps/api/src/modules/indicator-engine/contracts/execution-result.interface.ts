import type { IndicatorResult } from "./indicator-result.interface";
import type { IndicatorLifecycleState } from "./indicator-lifecycle.interface";
import type { ExecutionMetrics } from "./execution-metrics.interface";

/**
 * Item 7's own field list — the ENGINE's own wrapper around running one
 * execution, distinct from `IndicatorResult` (Phase 1 — the pure
 * calculation's own output: series of computed points). `ExecutionResult`
 * carries an `IndicatorResult` as its `producedValues` field, plus
 * everything ABOUT the execution itself that a calculation's own pure
 * output has no way to express: which lifecycle state it ended in, how
 * long it took, whether anything went wrong. The same "orchestrator
 * result vs. inner calculation result" split Phase 3's
 * `ImportJobResponseDto` vs. a raw imported row had in AI-101 — not
 * conflating "did the machinery work" with "what did the machinery
 * produce."
 *
 * **Immutable** (this phase's explicit rule) — `Object.freeze()`-d by
 * `ComputationEngine` before being returned, the same enforcement
 * discipline as `ExecutionContext`.
 */
export interface ExecutionWarning {
  code: string;
  message: string;
}

export interface ExecutionResult {
  executionId: string;
  indicatorInstanceId: string;
  durationMs: number;
  lifecycleStatus: IndicatorLifecycleState;
  calculationMetadata: { mode: string; candleCount: number };
  /** Present only when `lifecycleStatus === "COMPLETED"` — undefined for FAILED/CANCELLED, since there is no calculation output to report in either of those outcomes. */
  producedValues?: IndicatorResult;
  warnings: ExecutionWarning[];
  /** Present only when `lifecycleStatus === "FAILED"`. */
  errors: string[];
  metrics: ExecutionMetrics;
}
