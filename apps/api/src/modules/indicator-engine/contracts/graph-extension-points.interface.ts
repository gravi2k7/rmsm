import type { DependencyGraph } from "./dependency-graph.interface";
import type { ExecutionPlan } from "./execution-plan.interface";

/**
 * Extension points (item 13) — the same real-interface,
 * no-implementation discipline as Phase 2B's own
 * `extension-points.interface.ts`. Not redeclaring that file's 6
 * capabilities (distributed execution, parallel execution, GPU
 * acceleration, cluster execution already exist there) — this file adds
 * only the 3 genuinely NEW ones item 13 names for the graph layer
 * specifically: distributed graph execution, cached execution plans,
 * incremental graph updates. ("Parallel dependency execution" and
 * "cluster execution," item 13's other two, are the same underlying
 * capability as Phase 2B's `ParallelExecutionStrategy`/
 * `ClusterExecutionCoordinator` applied to a graph instead of a single
 * request — reused via those existing interfaces, not redeclared here.)
 */

/** Future: coordinating dependency graph resolution/planning itself (not just execution) across more than one process. */
export interface DistributedGraphCoordinator {
  coordinateGraphBuild(sourceDefinitionCount: number): Promise<DependencyGraph>;
}

/** Future: caching a generated ExecutionPlan keyed by (graph version, request) — distinct from Phase 1's IndicatorResultCache (which caches CALCULATION results, not the plan that led to them). */
export interface ExecutionPlanCache {
  get(graphId: string, requestHash: string): Promise<ExecutionPlan | null>;
  set(graphId: string, requestHash: string, plan: ExecutionPlan): Promise<void>;
}

/** Future: updating a graph incrementally when one definition changes (a new version registered), rather than rebuilding the entire graph from scratch — genuinely useful once the registry has enough definitions that a full rebuild becomes expensive, not yet a real concern at this project's current scale (28 definitions). */
export interface IncrementalGraphUpdater {
  applyDefinitionChange(currentGraph: DependencyGraph, changedIdentifier: string): Promise<DependencyGraph>;
}
