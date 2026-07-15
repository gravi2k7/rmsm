import { Injectable } from "@nestjs/common";
import type { DependencyGraph } from "../contracts/dependency-graph.interface";
import type { DependencyResolver as DependencyResolverContract, DependencyTreeNode } from "../contracts/dependency-resolver.interface";
import { DependencyNotFoundException, DependencyVersionException } from "../contracts/graph.errors";

/**
 * Real implementation of `contracts/dependency-resolver.interface.ts`
 * — item 2's 5 responsibilities. Pure graph traversal, no execution
 * ("No execution" — item 2's own words) — every method here reads
 * `DependencyGraph.edges`, none of them call `Indicator.calculate()`
 * or reach into AI-101.
 */
@Injectable()
export class DependencyResolverService implements DependencyResolverContract {
  resolveDirect(graph: DependencyGraph, identifier: string): DependencyTreeNode[] {
    return graph.edges
      .filter((edge) => edge.from === identifier)
      .map((edge) => this.buildLeafNode(graph, edge.to, edge.dependencyType));
  }

  resolveTransitive(graph: DependencyGraph, identifier: string): DependencyTreeNode[] {
    const visited = new Set<string>();
    const result: DependencyTreeNode[] = [];

    const walk = (current: string) => {
      for (const edge of graph.edges.filter((e) => e.from === current)) {
        if (visited.has(edge.to)) continue;
        visited.add(edge.to);
        result.push(this.buildLeafNode(graph, edge.to, edge.dependencyType));
        walk(edge.to);
      }
    };
    walk(identifier);

    return result;
  }

  detectMissing(graph: DependencyGraph, identifier: string): string[] {
    const nodeIds = new Set(graph.nodes.map((n) => n.identifier));
    const missing = new Set<string>();
    const visited = new Set<string>();

    const walk = (current: string) => {
      for (const edge of graph.edges.filter((e) => e.from === current)) {
        if (!nodeIds.has(edge.to)) {
          missing.add(edge.to);
          continue; // don't recurse into a node that doesn't exist
        }
        if (visited.has(edge.to)) continue;
        visited.add(edge.to);
        walk(edge.to);
      }
    };
    walk(identifier);

    return [...missing];
  }

  resolveVersion(graph: DependencyGraph, dependencyIdentifier: string, versionConstraint?: string): string {
    const matchingNodes = graph.nodes.filter((n) => n.identifier === dependencyIdentifier);
    if (matchingNodes.length === 0) {
      throw new DependencyNotFoundException(`No node for "${dependencyIdentifier}" exists in this graph.`, { dependencyIdentifier });
    }

    if (!versionConstraint) {
      // "Latest" among the versions actually present in THIS graph —
      // the graph builder only ever adds one node per identifier
      // (IndicatorRegistryService.listAll() already returns latest-only,
      // Phase 2A), so in practice there's exactly one match; this still
      // handles a graph with multiple versions of the same identifier
      // correctly rather than assuming that can't happen.
      return matchingNodes.map((n) => n.version).sort().reverse()[0]!;
    }

    const exact = matchingNodes.find((n) => n.version === versionConstraint);
    if (!exact) {
      throw new DependencyVersionException(`"${dependencyIdentifier}" has no node at version "${versionConstraint}" in this graph.`, { dependencyIdentifier, versionConstraint });
    }
    return exact.version;
  }

  produceDependencyTree(graph: DependencyGraph, rootIdentifier: string): DependencyTreeNode {
    const rootNode = graph.nodes.find((n) => n.identifier === rootIdentifier);
    if (!rootNode) {
      throw new DependencyNotFoundException(`No node for "${rootIdentifier}" exists in this graph.`, { rootIdentifier });
    }
    return this.buildTreeNode(graph, rootIdentifier, "required", new Set());
  }

  private buildLeafNode(graph: DependencyGraph, identifier: string, dependencyType: DependencyTreeNode["dependencyType"]): DependencyTreeNode {
    return this.buildTreeNode(graph, identifier, dependencyType, new Set());
  }

  private buildTreeNode(graph: DependencyGraph, identifier: string, dependencyType: DependencyTreeNode["dependencyType"], ancestors: Set<string>): DependencyTreeNode {
    const node = graph.nodes.find((n) => n.identifier === identifier);
    // A missing node here is a real InvalidGraphException-level problem
    // GraphValidatorService should have already caught before this
    // resolver ever runs against the graph — this defensive check
    // exists so a caller who skipped validation gets a clear error
    // rather than a confusing "undefined" downstream.
    if (!node) {
      throw new DependencyNotFoundException(`No node for "${identifier}" exists in this graph.`, { identifier });
    }

    // Cycle guard: if this identifier is already one of its own
    // ancestors in the tree being built, stop recursing rather than
    // infinite-loop — GraphValidatorService's own cycle check should
    // already prevent this graph from existing at all, but this method
    // doesn't assume its caller always validates first.
    if (ancestors.has(identifier)) {
      return { identifier: node.identifier, version: node.version, dependencyType, children: [] };
    }

    const nextAncestors = new Set(ancestors).add(identifier);
    const children = graph.edges
      .filter((e) => e.from === identifier)
      .map((e) => this.buildTreeNode(graph, e.to, e.dependencyType, nextAncestors));

    return { identifier: node.identifier, version: node.version, dependencyType, children };
  }
}
