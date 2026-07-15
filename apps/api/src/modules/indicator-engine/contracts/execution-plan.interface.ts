import type { CalculationMode } from "./calculation-window.interface";
import type { DependencyTreeNode } from "./dependency-resolver.interface";

/**
 * The explicitly recommended addition — "each generated execution plan
 * should estimate: number of indicator nodes, dependency depth,
 * estimated computation cost, parallelization opportunities (metadata
 * only)." A real, computed value on every `ExecutionPlan`
 * (`ExecutionPlannerService.estimateComplexity()`, this phase's real
 * implementation), not a placeholder field nothing populates.
 */
export interface ExecutionComplexityEstimate {
  nodeCount: number;
  dependencyDepth: number;
  /** A dimensionless relative score (not milliseconds — this phase has no real calculation to time), computed from nodeCount and dependencyDepth together, so two plans can be meaningfully compared against each other even though neither number alone means "this many milliseconds." */
  estimatedComputationCost: number;
  /** Groups of steps with no dependency relationship to each other — metadata only, per the recommendation's own words; nothing in this phase actually parallelizes based on it (that's ExecutionScheduler's own future extension point, Phase 2B). */
  parallelizationOpportunities: string[][];
}

/**
 * Item 8's own field list, exactly: plan id, graph id, ordered
 * execution steps, dependency tree, calculation mode, execution
 * metadata, estimated complexity. **Immutable** (this phase's explicit
 * rule) — `Object.freeze()`-d by `ExecutionPlannerService` before being
 * returned, the same enforcement discipline `IndicatorDefinition`
 * (Phase 2A) and `ExecutionContext`/`ExecutionResult` (Phase 2B)
 * already established.
 */
export interface ExecutionPlanStep {
  identifier: string;
  version: string;
  /** This step's position in the dependency-respecting order — 0-indexed, so step 0 always has no unresolved dependency on any later step. */
  order: number;
}

export interface ExecutionPlan {
  planId: string;
  graphId: string;
  executionOrder: ExecutionPlanStep[];
  dependencyTree: DependencyTreeNode;
  calculationMode: CalculationMode;
  executionMetadata: {
    timeoutPolicy: { timeoutMs?: number };
    cancellationPolicy: { cancellable: boolean };
  };
  estimatedComplexity: ExecutionComplexityEstimate;
}
