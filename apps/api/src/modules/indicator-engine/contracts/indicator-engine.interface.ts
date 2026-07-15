import type { IndicatorExecutionRequest, IndicatorExecutionResult } from "./indicator-execution.interface";

/**
 * The single public entry point every future consumer (AI-103+, and any
 * internal AI-102 scheduler) actually calls — everything else in
 * `contracts/` (Registry, Factory, dependency graph, computation
 * engine) is internal machinery this interface's real Phase 2+
 * implementation composes, not something a caller outside AI-102 ever
 * touches directly. Mirrors AI-101's own `MarketDataService` as "the
 * one read-side API future modules consume" — the same shape, applied
 * to indicator computation instead of market-data reads.
 */
export interface IndicatorEngine {
  execute(request: IndicatorExecutionRequest): Promise<IndicatorExecutionResult>;
  /** Batch form — a future AI-104 Scanner running one indicator across a large watchlist (this phase's own "large watchlists" performance-goals item) needs this shape, not N sequential `execute()` calls, so the engine has a real seam for batching/parallelizing internally. */
  executeBatch(requests: IndicatorExecutionRequest[]): Promise<IndicatorExecutionResult[]>;
}
