import { Injectable } from "@nestjs/common";
import type { DependencyGraph } from "../contracts/dependency-graph.interface";
import type { GraphMetrics } from "../contracts/graph-metrics.interface";
import { TopologicalSorterService } from "./topological-sorter.service";

/**
 * Real implementation computing item 10's own field list. `graphDepth`/
 * `longestDependencyChain` are computed by finding the longest chain
 * across EVERY root node in the graph (a node nothing else depends on)
 * — the genuine worst case for the whole graph, not just one
 * indicator's own subgraph.
 */
@Injectable()
export class GraphMetricsService {
  constructor(private readonly sorter: TopologicalSorterService) {}

  compute(graph: DependencyGraph): GraphMetrics {
    const roots = this.findRoots(graph);
    let longestChain: string[] = [];

    for (const root of roots) {
      const order = this.sorter.sort(graph, root);
      if (order.length > longestChain.length) {
        longestChain = order;
      }
    }

    return {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      graphDepth: longestChain.length,
      dependencyCount: graph.edges.length,
      longestDependencyChain: longestChain,
      estimatedExecutionComplexity: this.estimateComplexity(graph.nodes.length, longestChain.length),
    };
  }

  /** A node nothing else in the graph depends on — the natural "top" of a dependency chain (e.g. institutional_structure, which nothing depends on, vs. atr, which several things depend on). */
  private findRoots(graph: DependencyGraph): string[] {
    const dependedUpon = new Set(graph.edges.map((e) => e.to));
    return graph.nodes.map((n) => n.identifier).filter((id) => !dependedUpon.has(id));
  }

  /** Same dimensionless relative-score approach as ExecutionComplexityEstimate (execution-plan.interface.ts) — nodeCount and depth together, not a millisecond estimate this phase has no real calculation timing to base one on. */
  private estimateComplexity(nodeCount: number, depth: number): number {
    return nodeCount * Math.max(1, depth);
  }
}
