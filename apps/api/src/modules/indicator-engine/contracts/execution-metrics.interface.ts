/**
 * Runtime metadata (item 9) — every duration item 9 names, exactly:
 * execution duration, queue time, initialization time, calculation
 * time, validation time. "Metrics only, no monitoring implementation"
 * — this is the DATA shape; a real Phase 2B implementation
 * (`engine/execution-metrics.service.ts`) is a genuine, in-memory
 * aggregator over instances of this shape (the same honestly-scoped
 * precedent as AI-101's `MarketDataMetricsService` — real counters for
 * one running instance, not a production monitoring backend), but this
 * interface itself is just the per-execution timing breakdown.
 */
export interface ExecutionMetrics {
  queueTimeMs: number;
  validationTimeMs: number;
  initializationTimeMs: number;
  calculationTimeMs: number;
  /** The sum of every phase above, plus any overhead between them — not a recomputed total, the actual measured wall-clock span from request-received to result-returned, so a real implementation's own bookkeeping bug (a gap between two measured phases) would show up as `totalDurationMs > sum of the others` rather than being silently hidden by definition. */
  totalDurationMs: number;
}
