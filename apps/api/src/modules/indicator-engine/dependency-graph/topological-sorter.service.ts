import { Injectable } from "@nestjs/common";
import type { DependencyGraph } from "../contracts/dependency-graph.interface";
import { CircularDependencyException } from "../contracts/graph.errors";

/**
 * Real topological sort (item 4) via Kahn's algorithm — item 4's own
 * worked example, exactly: EMA → MACD → Strategy Indicator sorts as
 * `["ema", "macd", "strategy_indicator"]`, dependencies always before
 * dependents, verified by a dedicated test using that literal example
 * (`topological-sorter.service.spec.ts`).
 *
 * Operates on the REACHABLE SUBGRAPH from one root identifier (the
 * root plus every transitive dependency) — not the entire registry's
 * graph, since sorting unrelated indicators against each other has no
 * meaningful order and would only add noise.
 */
@Injectable()
export class TopologicalSorterService {
  sort(graph: DependencyGraph, rootIdentifier: string): string[] {
    const subgraph = this.reachableSubgraph(graph, rootIdentifier);
    const inDegree = new Map<string, number>();
    for (const identifier of subgraph) inDegree.set(identifier, 0);

    // In-degree here means "how many dependencies (within the subgraph)
    // this node itself has" — an edge {from: dependent, to: dependency}
    // increments the DEPENDENT's in-degree, since the dependent cannot
    // run until that dependency has (the DAG edge for sort purposes
    // conceptually runs dependency -> dependent, the reverse of this
    // module's own DependencyEdge.from/to convention).
    for (const edge of graph.edges) {
      if (subgraph.has(edge.from) && subgraph.has(edge.to)) {
        inDegree.set(edge.from, (inDegree.get(edge.from) ?? 0) + 1);
      }
    }

    const queue: string[] = [...subgraph].filter((id) => inDegree.get(id) === 0).sort();
    const order: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      order.push(current);

      // Every node that depends ON `current` (edges where to === current)
      // has one fewer unresolved dependency now.
      for (const edge of graph.edges) {
        if (edge.to === current && subgraph.has(edge.from)) {
          const remaining = (inDegree.get(edge.from) ?? 0) - 1;
          inDegree.set(edge.from, remaining);
          if (remaining === 0) queue.push(edge.from);
        }
      }
    }

    if (order.length < subgraph.size) {
      // Kahn's algorithm's own, textbook cycle signal: not every node
      // could be processed, meaning something in the subgraph has an
      // in-degree that never reached 0 — a real cycle, not swallowed
      // silently even if CycleDetectorService wasn't called first.
      const unprocessed = [...subgraph].filter((id) => !order.includes(id));
      throw new CircularDependencyException(`Cannot topologically sort — a cycle exists among: ${unprocessed.join(", ")}.`, { unprocessed });
    }

    return order;
  }

  private reachableSubgraph(graph: DependencyGraph, rootIdentifier: string): Set<string> {
    const reachable = new Set<string>([rootIdentifier]);
    const queue = [rootIdentifier];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      for (const edge of graph.edges) {
        if (edge.from === current && !reachable.has(edge.to)) {
          reachable.add(edge.to);
          queue.push(edge.to);
        }
      }
    }

    return reachable;
  }
}
