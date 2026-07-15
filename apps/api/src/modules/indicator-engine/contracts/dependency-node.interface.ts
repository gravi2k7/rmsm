/**
 * One indicator in a dependency graph — item 1's "indicator nodes."
 * Deliberately minimal: just enough to identify which
 * `IndicatorDefinition` (Phase 2A) this node represents. The graph
 * itself doesn't embed the full definition (that would duplicate data
 * the registry already owns and risk it drifting stale) — a node is a
 * reference, resolved back through `IndicatorRegistryService.getVersion()`
 * whenever full metadata is actually needed.
 */
export interface DependencyNode {
  identifier: string;
  version: string;
}
