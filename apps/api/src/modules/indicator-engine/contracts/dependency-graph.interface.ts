/**
 * Dependency resolution and circular-dependency prevention (item 7).
 * Built from `IndicatorMetadata.dependencies` (identifier references,
 * IndicatorMetadata's own field) — this graph is derived from registry
 * data, not a separate thing a caller constructs by hand.
 */

export interface DependencyGraphNode {
  identifier: string;
  dependsOn: string[];
}

export interface CircularDependencyError {
  /** The identifiers forming the cycle, in order — e.g. ["A", "B", "C", "A"] for A→B→C→A, so the actual cycle is visible, not just "a cycle exists somewhere." */
  cycle: string[];
}

export interface DependencyGraph {
  /** Topological order — dependencies before dependents, the order the computation engine must calculate in (a MACD before the EMAs it depends on would produce garbage). Throws if a cycle exists rather than silently producing a partial or arbitrary order. */
  resolveExecutionOrder(rootIdentifier: string): string[];
  /** Detection without throwing — a future registry-validation step (validation.interface.ts) or an admin "is this custom indicator's dependency set even valid" check calls this before committing to using resolveExecutionOrder's throwing behavior. */
  detectCycle(rootIdentifier: string): CircularDependencyError | null;
}
