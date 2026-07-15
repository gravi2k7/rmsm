import type { IndicatorExecutionRequest } from "./indicator-execution.interface";

/**
 * Execution scheduling, dependency ordering, parallel-execution
 * opportunities, error propagation, and computation context (item 10) —
 * the internal machinery `IndicatorEngine`'s real Phase 2+
 * implementation composes underneath its own public `execute()`/
 * `executeBatch()` methods. Not itself a public entry point (no future
 * AI-10x module calls this directly — `IndicatorEngine` is the only
 * public surface, per that interface's own comment).
 */

export interface ComputationPlan {
  /** The dependency-graph-resolved order (DependencyGraph.resolveExecutionOrder) this plan will execute indicators in. */
  executionOrder: string[];
  /** Which steps in executionOrder have no dependency relationship to each other and could, in principle, run concurrently — a real opportunity the scheduler MAY exploit, not a guarantee that it does (Phase 2+'s own implementation decision, not fixed by this contract). */
  parallelizableGroups: string[][];
}

export interface ComputationError {
  indicatorIdentifier: string;
  error: Error;
  /** Whether this failure should abort the whole batch (a dependency every subsequent step needs failed) or can be isolated (an independent indicator in the same batch failed, but others can still complete) — error propagation (item 10) is a real design decision a Phase 2+ implementation must make per-case, not something this contract decides globally. */
  isFatal: boolean;
}

export interface ComputationScheduler {
  buildPlan(rootRequests: IndicatorExecutionRequest[]): ComputationPlan;
  /** Executes a plan, returning both what succeeded and what didn't — a batch with some failures is a normal, expected outcome (matching this phase's own "large watchlists" performance-goals framing: a 10,000-indicator batch WILL have some individual failures at that scale, and the caller needs partial results, not an all-or-nothing failure). */
  executePlan(plan: ComputationPlan): Promise<{ succeeded: import("./indicator-execution.interface").IndicatorExecutionResult[]; failed: ComputationError[] }>;
}
