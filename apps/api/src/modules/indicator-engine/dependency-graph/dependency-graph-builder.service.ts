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
 */
@Injectable()
export class DependencyGraphBuilderService {
  constructor(private readonly registry: IndicatorRegistryService) {}

  build(): DependencyGraph {
    const definitions = this.registry.listAll();

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

    return this.deepFreeze(graph);
  }

  private deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value as Record<string, unknown>).forEach((v) => this.deepFreeze(v));
    return Object.freeze(value);
  }
}
