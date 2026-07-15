import { GraphMetricsService } from "../graph-metrics.service";
import { TopologicalSorterService } from "../topological-sorter.service";
import type { DependencyGraph } from "../../contracts/dependency-graph.interface";

function buildGraph(): DependencyGraph {
  return {
    graphId: "g1",
    graphVersion: "1.0.0",
    nodes: [
      { identifier: "strategy_indicator", version: "1.0.0" },
      { identifier: "macd", version: "1.0.0" },
      { identifier: "ema", version: "1.0.0" },
      { identifier: "unrelated", version: "1.0.0" },
    ],
    edges: [
      { from: "strategy_indicator", to: "macd", dependencyType: "required", executionPriority: 0, metadata: {} },
      { from: "macd", to: "ema", dependencyType: "required", executionPriority: 0, metadata: {} },
    ],
    metadata: { builtAt: new Date(), sourceDefinitionCount: 4 },
  };
}

describe("GraphMetricsService", () => {
  let metrics: GraphMetricsService;

  beforeEach(() => {
    metrics = new GraphMetricsService(new TopologicalSorterService());
  });

  it("computes nodeCount and edgeCount as real counts", () => {
    const result = metrics.compute(buildGraph());
    expect(result.nodeCount).toBe(4);
    expect(result.edgeCount).toBe(2);
  });

  it("computes graphDepth as the longest chain among all roots", () => {
    const result = metrics.compute(buildGraph());
    expect(result.graphDepth).toBe(3); // ema -> macd -> strategy_indicator
    expect(result.longestDependencyChain).toEqual(["ema", "macd", "strategy_indicator"]);
  });

  it("an isolated node (no dependents, no dependencies) is its own root with depth 1", () => {
    const result = metrics.compute(buildGraph());
    // "unrelated" is a root too (nothing depends on it), but its own
    // chain length (1) is shorter than strategy_indicator's (3), so it
    // doesn't win the longestDependencyChain comparison.
    expect(result.longestDependencyChain).not.toContain("unrelated");
  });

  it("estimatedExecutionComplexity is a real, non-zero computed value", () => {
    const result = metrics.compute(buildGraph());
    expect(result.estimatedExecutionComplexity).toBeGreaterThan(0);
    expect(result.estimatedExecutionComplexity).toBe(result.nodeCount * result.graphDepth);
  });
});
