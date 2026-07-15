/**
 * Item 10's own field list, exactly: node count, edge count, graph
 * depth, dependency count, longest dependency chain, estimated
 * execution complexity. "Metrics only, no monitoring implementation" —
 * the same honestly-scoped disposition as Phase 2B's `ExecutionMetrics`
 * and AI-101's `MarketDataMetricsService`.
 */
export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  /** The longest path from any leaf (no dependencies) to any root (nothing depends on it) — the same value ExecutionComplexityEstimate.dependencyDepth (execution-plan.interface.ts) reports for one specific root, generalized here to the whole graph's own worst case. */
  graphDepth: number;
  dependencyCount: number;
  /** The actual identifier sequence of the single longest chain — not just its length (graphDepth already gives that), so a reader can see WHICH indicators form the bottleneck. */
  longestDependencyChain: string[];
  estimatedExecutionComplexity: number;
}
