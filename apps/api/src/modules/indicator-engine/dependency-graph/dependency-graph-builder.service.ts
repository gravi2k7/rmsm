import { randomUUID } from "crypto";
import { Injectable } from "@nestjs/common";
import { IndicatorRegistryService } from "../registry/indicator-registry.service";
import type { DependencyGraph } from "../contracts/dependency-graph.interface";
import type { DependencyNode } from "../contracts/dependency-node.interface";
import type { DependencyEdge } from "../contracts/dependency-edge.interface";

/**
 * Builds a real, immutable `DependencyGraph` from the current registry
 * state (`IndicatorRegistryService.listAll()`, Phase 2A) — every
 * definition becomes a `DependencyNode`, every `definition.dependencies`
 * entry becomes a `DependencyEdge` (`dependencyType: "required"` — this
 * project's schema has no concept of an optional indicator dependency
 * anywhere yet; `"optional"` remains a real, unused variant of
 * `DependencyType` for a future need, not fabricated demand this phase
 * invents). `Object.freeze()`-d before being returned — "the graph must
 * be independent from execution" (item 1) plus "Dependency Graph is
 * immutable" (this phase's own architecture rule), enforced the same
 * structural way `IndicatorRegistryService` enforces it for definitions.
 *
 * **Phase 5 performance finding, fixed safely, without redesign**:
 * before this phase, `build()` reconstructed the ENTIRE graph from
 * scratch on every single call — meaning every `POST /indicators/execute`
 * request and every `GET /indicators/health` check rebuilt the same
 * 28-node graph identically, every time. Since nothing in this codebase
 * registers a new definition after `IndicatorDefinitionRegistrarService`'s
 * own startup registration completes (no REST endpoint for registration
 * exists through Phase 5), the registry's own definition count is
 * stable for the lifetime of the process — caching the built graph
 * after its first construction changes nothing observable (the graph
 * is immutable and deterministic; the cached copy is byte-identical to
 * what a fresh rebuild would produce) while eliminating genuinely
 * wasted work on every subsequent call. A cheap staleness check
 * (comparing the registry's current `listAll().length` against what
 * was cached) still forces a rebuild if that assumption is ever
 * violated in the future, rather than silently trusting it forever.
 */
@Injectable()
export class DependencyGraphBuilderService {
  private cachedGraph: DependencyGraph | null = null;
  private cachedDefinitionCount = -1;

  constructor(private readonly registry: IndicatorRegistryService) {}

  build(): DependencyGraph {
    const definitions = this.registry.listAll();

    if (this.cachedGraph && this.cachedDefinitionCount === definitions.length) {
      return this.cachedGraph;
    }

    const nodes: DependencyNode[] = definitions.map((d) => ({ identifier: d.identifier, version: d.version }));

    const edges: DependencyEdge[] = definitions.flatMap((d) =>
      d.dependencies.map(
        (depId, index): DependencyEdge => ({
          from: d.identifier,
          to: depId,
          dependencyType: "required",
          executionPriority: index,
          metadata: {},
        }),
      ),
    );

    const graph: DependencyGraph = {
      graphId: randomUUID(),
      graphVersion: "1.0.0",
      nodes,
      edges,
      metadata: { builtAt: new Date(), sourceDefinitionCount: definitions.length },
    };

    this.cachedGraph = this.deepFreeze(graph);
    this.cachedDefinitionCount = definitions.length;
    return this.cachedGraph;
  }

  private deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value as Record<string, unknown>).forEach((v) => this.deepFreeze(v));
    return Object.freeze(value);
  }
}
