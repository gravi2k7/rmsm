import type { DependencyNode } from "./dependency-node.interface";
import type { DependencyEdge } from "./dependency-edge.interface";

/**
 * Phase 2C restructuring, flagged explicitly (the same category of
 * change as Phase 2A's `IndicatorMetadata` split and Phase 2B's
 * `IndicatorContext` → `ExecutionContext`): Phase 1's `DependencyGraph`
 * was a thin pair of methods over plain identifier strings
 * (`resolveExecutionOrder`/`detectCycle`). This phase's own item 1 wants
 * a real, immutable graph — indicator nodes, dependency edges, metadata,
 * a graph version, validation — "independent from execution" (item 1's
 * own words: the graph is pure topology, it doesn't know about
 * calculation modes, timeouts, or execution plans — those are
 * `ExecutionPlan`'s job, built FROM a graph plus a request).
 *
 * Built from `IndicatorDefinition.dependencies` (Phase 2A) — a graph is
 * always derived from registry data via `DependencyGraphBuilder`
 * (`engine/dependency-graph-builder.service.ts`, this phase's real
 * implementation), never constructed by hand.
 */
export interface DependencyGraphMetadata {
  builtAt: Date;
  /** How many IndicatorDefinitions this graph's nodes were resolved from — a real, checkable fact about the graph's own provenance. */
  sourceDefinitionCount: number;
}

export interface DependencyGraph {
  graphId: string;
  /** Bumped whenever the graph is rebuilt from a changed registry state — distinct from any individual indicator's own `IndicatorDefinition.version`; this is the GRAPH's own version, not a version of any one node. */
  graphVersion: string;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  metadata: DependencyGraphMetadata;
}

export interface CircularDependencyInfo {
  /** The identifiers forming the cycle, in order — e.g. ["A", "B", "C", "A"], so the actual cycle is visible, not just "a cycle exists somewhere." Carried forward from Phase 1's `CircularDependencyError` shape unchanged, just renamed to avoid colliding with `contracts/graph.errors.ts`'s real `CircularDependencyException` class this phase adds. */
  cycle: string[];
}
