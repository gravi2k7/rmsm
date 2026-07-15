import type { DependencyGraph } from "./dependency-graph.interface";

/**
 * Item 6's own check list, exactly: duplicate nodes, missing
 * dependencies, invalid versions, invalid references, unsupported
 * indicators, unsupported timeframes, invalid graph structure. A SIXTH
 * validator in this project now (Phase 1's `IndicatorValidator`,
 * request-vs-definition; Phase 2A's `RegistryValidator`,
 * definition-vs-registration; Phase 2B's `ExecutionValidator`,
 * context-vs-execution; and now `GraphValidator`,
 * graph-vs-graph-structure) — each answering a genuinely distinct
 * question at a distinct point in this engine's own lifecycle, not
 * redundant restatements of each other.
 */
export interface GraphValidator {
  /** All 7 checks item 6 names, run together — a graph is either valid or it's rejected outright with a descriptive GraphError subclass (graph.errors.ts), the same "one atomic pass, fail on the first real problem" discipline RegistryValidator (Phase 2A) established. */
  validate(graph: DependencyGraph): void;
}
