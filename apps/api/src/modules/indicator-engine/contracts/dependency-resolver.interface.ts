import type { DependencyGraph } from "./dependency-graph.interface";

/**
 * Item 2's own responsibility list, exactly: resolve direct
 * dependencies, resolve transitive dependencies, detect missing
 * dependencies, resolve indicator versions, produce dependency tree.
 * "No execution" — this is pure graph traversal over an already-built
 * `DependencyGraph`, never invoking `Indicator.calculate()`.
 */

/** A dependency tree node — the resolved, nested shape a caller actually wants ("what does this indicator need, and what do THOSE need"), distinct from the flat DependencyGraph.edges array it's built from. */
export interface DependencyTreeNode {
  identifier: string;
  version: string;
  dependencyType: import("./dependency-edge.interface").DependencyType;
  children: DependencyTreeNode[];
}

export interface DependencyResolver {
  /** Just the immediate dependencies named by one indicator's own definition — one level, not transitive. */
  resolveDirect(graph: DependencyGraph, identifier: string): DependencyTreeNode[];
  /** Every dependency reachable from one indicator, at any depth — MACD's EMAs, and anything THOSE EMAs might themselves depend on (none, today, but the resolver doesn't assume that). */
  resolveTransitive(graph: DependencyGraph, identifier: string): DependencyTreeNode[];
  /** Identifiers named as a dependency (directly or transitively) that have no corresponding node in the graph — a real, checkable gap distinct from RegistryValidatorService's own registration-time check (Phase 2A): that check runs once, when a definition is FIRST registered; this runs against whatever the CURRENT graph actually contains, which could have changed since. */
  detectMissing(graph: DependencyGraph, identifier: string): string[];
  /** Resolves a specific version for a dependency edge with a `versionConstraint` (DependencyEdge, this phase) — or the dependency's latest registered version when no constraint is given, the same default IndicatorRegistryService.get() (Phase 2A) uses. */
  resolveVersion(graph: DependencyGraph, dependencyIdentifier: string, versionConstraint?: string): string;
  /** The full, nested dependency tree for one root indicator — resolveTransitive's result, reorganized into the actual parent-child nesting a caller would want to render or reason about, not just a flat reachable-set list. */
  produceDependencyTree(graph: DependencyGraph, rootIdentifier: string): DependencyTreeNode;
}
