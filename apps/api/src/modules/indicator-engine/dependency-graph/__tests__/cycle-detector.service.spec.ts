import { CycleDetectorService } from "../cycle-detector.service";
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

describe("CycleDetectorService", () => {
  let detector: CycleDetectorService;

  beforeEach(() => {
    detector = new CycleDetectorService();
  });

  it("returns null for an acyclic graph", () => {
    const graph = buildGraph([["macd", "ema"]]);
    expect(detector.detectCycle(graph)).toBeNull();
  });

  it("detects a direct cycle: A -> B -> A", () => {
    const graph = buildGraph([["a", "b"], ["b", "a"]]);
    const result = detector.detectCycle(graph);
    expect(result).not.toBeNull();
    expect(result!.cycle).toContain("a");
    expect(result!.cycle).toContain("b");
  });

  it("detects a 3-node cycle: A -> B -> C -> A (this phase's own worked example)", () => {
    const graph = buildGraph([["a", "b"], ["b", "c"], ["c", "a"]]);
    const result = detector.detectCycle(graph);
    expect(result).not.toBeNull();
    expect(result!.cycle[0]).toBe(result!.cycle[result!.cycle.length - 1]);
  });

  it("does NOT flag a diamond dependency as a cycle — institutional_structure depending on 2 things that share no cycle is legitimate", () => {
    // top depends on both mid1 and mid2, both of which depend on the
    // same leaf — a real, common, and entirely valid shape.
    const graph = buildGraph([
      ["top", "mid1"],
      ["top", "mid2"],
      ["mid1", "leaf"],
      ["mid2", "leaf"],
    ]);
    expect(detector.detectCycle(graph)).toBeNull();
  });

  it("returns null for a graph with isolated nodes and no edges at all", () => {
    const graph = buildGraph([], ["a", "b", "c"]);
    expect(detector.detectCycle(graph)).toBeNull();
  });

  it("detects a cycle even when it's not reachable from the first node iterated", () => {
    const graph = buildGraph([
      ["independent", "leaf"],
      ["x", "y"],
      ["y", "x"],
    ]);
    const result = detector.detectCycle(graph);
    expect(result).not.toBeNull();
  });
});
