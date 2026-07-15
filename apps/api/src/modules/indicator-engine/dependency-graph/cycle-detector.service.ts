import { Injectable } from "@nestjs/common";
import type { DependencyGraph } from "../contracts/dependency-graph.interface";
import type { CircularDependencyInfo } from "../contracts/dependency-graph.interface";

/**
 * Real cycle detection (item 5) — depth-first search tracking both a
 * "fully visited" set (nodes whose entire subtree has already been
 * explored, safe to skip) and a "currently on the recursion stack" set
 * (nodes on the CURRENT path — revisiting one of these means a cycle,
 * not just a diamond-shaped dependency, which is legitimate and
 * common: institutional_structure depending on both
 * market_state_engine and liquidity_detection, which could in
 * principle share a deeper common dependency, is NOT a cycle).
 * Descriptive on detection (item 5's own "provide descriptive
 * exceptions") — returns the actual cycle sequence, e.g.
 * `["a", "b", "c", "a"]`, not just "a cycle exists somewhere."
 */
@Injectable()
export class CycleDetectorService {
  detectCycle(graph: DependencyGraph): CircularDependencyInfo | null {
    const adjacency = this.buildAdjacency(graph);
    const visited = new Set<string>();
    const onStack = new Set<string>();
    const path: string[] = [];

    for (const node of graph.nodes) {
      if (visited.has(node.identifier)) continue;
      const cycle = this.dfs(node.identifier, adjacency, visited, onStack, path);
      if (cycle) return { cycle };
    }

    return null;
  }

  private dfs(
    identifier: string,
    adjacency: Map<string, string[]>,
    visited: Set<string>,
    onStack: Set<string>,
    path: string[],
  ): string[] | null {
    visited.add(identifier);
    onStack.add(identifier);
    path.push(identifier);

    for (const dependency of adjacency.get(identifier) ?? []) {
      if (onStack.has(dependency)) {
        // Found the cycle — slice the path from where `dependency` first
        // appeared, so the returned sequence is exactly the cycle, not
        // the full DFS path leading up to it.
        const cycleStart = path.indexOf(dependency);
        return [...path.slice(cycleStart), dependency];
      }
      if (!visited.has(dependency)) {
        const found = this.dfs(dependency, adjacency, visited, onStack, path);
        if (found) return found;
      }
    }

    path.pop();
    onStack.delete(identifier);
    return null;
  }

  private buildAdjacency(graph: DependencyGraph): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();
    for (const edge of graph.edges) {
      const existing = adjacency.get(edge.from) ?? [];
      existing.push(edge.to);
      adjacency.set(edge.from, existing);
    }
    return adjacency;
  }
}
