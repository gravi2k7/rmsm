import { TopologicalSorterService } from "../topological-sorter.service";
import { CircularDependencyException } from "../../contracts/graph.errors";
import type { DependencyGraph } from "../../contracts/dependency-graph.interface";

function buildGraph(edges: [string, string][], extraNodes: string[] = []): DependencyGraph {
  const identifiers = new Set([...edges.flatMap(([from, to]) => [from, to]), ...extraNodes]);
  return {
    graphId: "g1",
    graphVersion: "1.0.0",
    nodes: [...identifiers].map((identifier) => ({ identifier, version: "1.0.0" })),
    edges: edges.map(([from, to]) => ({ from, to, dependencyType: "required" as const, executionPriority: 0, metadata: {} })),
    metadata: { builtAt: new Date(), sourceDefinitionCount: identifiers.size },
  };
}

describe("TopologicalSorterService", () => {
  let sorter: TopologicalSorterService;

  beforeEach(() => {
    sorter = new TopologicalSorterService();
  });

  it("this phase's own worked example, exactly: EMA -> MACD -> Strategy Indicator sorts dependencies first", () => {
    const graph = buildGraph([
      ["strategy_indicator", "macd"],
      ["macd", "ema"],
    ]);
    expect(sorter.sort(graph, "strategy_indicator")).toEqual(["ema", "macd", "strategy_indicator"]);
  });

  it("a leaf indicator with no dependencies sorts to just itself", () => {
    const graph = buildGraph([], ["ema"]);
    expect(sorter.sort(graph, "ema")).toEqual(["ema"]);
  });

  it("sorts a diamond dependency correctly — both mid-tier deps before the shared root, leaf before both", () => {
    const graph = buildGraph([
      ["top", "mid1"],
      ["top", "mid2"],
      ["mid1", "leaf"],
      ["mid2", "leaf"],
    ]);
    const order = sorter.sort(graph, "top");
    expect(order.indexOf("leaf")).toBeLessThan(order.indexOf("mid1"));
    expect(order.indexOf("leaf")).toBeLessThan(order.indexOf("mid2"));
    expect(order.indexOf("mid1")).toBeLessThan(order.indexOf("top"));
    expect(order.indexOf("mid2")).toBeLessThan(order.indexOf("top"));
    expect(order[order.length - 1]).toBe("top");
  });

  it("throws CircularDependencyException for a cyclic subgraph rather than returning a bad order", () => {
    const graph = buildGraph([["a", "b"], ["b", "a"]]);
    expect(() => sorter.sort(graph, "a")).toThrow(CircularDependencyException);
  });

  it("only includes the reachable subgraph — unrelated indicators elsewhere in the same graph are excluded", () => {
    const graph = buildGraph([["macd", "ema"]], ["unrelated_indicator"]);
    const order = sorter.sort(graph, "macd");
    expect(order).not.toContain("unrelated_indicator");
  });

  it("Institutional Structure's real 4-way dependency chain (this project's own actual proprietary indicator) sorts correctly", () => {
    // Mirrors the real registered shape from Phase 2A's
    // proprietary.definitions.ts exactly.
    const graph = buildGraph([
      ["institutional_structure", "market_state_engine"],
      ["institutional_structure", "liquidity_detection"],
      ["institutional_structure", "order_blocks"],
      ["institutional_structure", "bos"],
      ["liquidity_detection", "swing_detection"],
      ["bos", "swing_detection"],
    ]);
    const order = sorter.sort(graph, "institutional_structure");
    expect(order.indexOf("swing_detection")).toBeLessThan(order.indexOf("liquidity_detection"));
    expect(order.indexOf("swing_detection")).toBeLessThan(order.indexOf("bos"));
    expect(order[order.length - 1]).toBe("institutional_structure");
  });
});
