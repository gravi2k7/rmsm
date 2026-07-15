import { DependencyResolverService } from "../dependency-resolver.service";
import { DependencyNotFoundException, DependencyVersionException } from "../../contracts/graph.errors";
import type { DependencyGraph } from "../../contracts/dependency-graph.interface";

function buildGraph(): DependencyGraph {
  return {
    graphId: "g1",
    graphVersion: "1.0.0",
    nodes: [
      { identifier: "strategy_indicator", version: "1.0.0" },
      { identifier: "macd", version: "1.0.0" },
      { identifier: "ema", version: "1.0.0" },
    ],
    edges: [
      { from: "strategy_indicator", to: "macd", dependencyType: "required", executionPriority: 0, metadata: {} },
      { from: "macd", to: "ema", dependencyType: "required", executionPriority: 0, metadata: {} },
    ],
    metadata: { builtAt: new Date(), sourceDefinitionCount: 3 },
  };
}

describe("DependencyResolverService", () => {
  let resolver: DependencyResolverService;

  beforeEach(() => {
    resolver = new DependencyResolverService();
  });

  it("resolveDirect returns only the immediate dependency, not transitive ones", () => {
    const direct = resolver.resolveDirect(buildGraph(), "strategy_indicator");
    expect(direct.map((d) => d.identifier)).toEqual(["macd"]);
  });

  it("resolveTransitive returns every dependency at any depth", () => {
    const transitive = resolver.resolveTransitive(buildGraph(), "strategy_indicator");
    expect(transitive.map((d) => d.identifier).sort()).toEqual(["ema", "macd"]);
  });

  it("detectMissing returns an empty array for a fully-satisfied graph", () => {
    expect(resolver.detectMissing(buildGraph(), "strategy_indicator")).toEqual([]);
  });

  it("detectMissing finds an identifier referenced but not present as a node", () => {
    const graph = buildGraph();
    (graph.edges as { to: string }[])[1]!.to = "does_not_exist";
    expect(resolver.detectMissing(graph, "strategy_indicator")).toContain("does_not_exist");
  });

  it("resolveVersion returns the exact version when a constraint is given", () => {
    expect(resolver.resolveVersion(buildGraph(), "ema", "1.0.0")).toBe("1.0.0");
  });

  it("resolveVersion throws DependencyVersionException for a constraint that doesn't match", () => {
    expect(() => resolver.resolveVersion(buildGraph(), "ema", "9.9.9")).toThrow(DependencyVersionException);
  });

  it("resolveVersion throws DependencyNotFoundException for an identifier not in the graph at all", () => {
    expect(() => resolver.resolveVersion(buildGraph(), "does_not_exist")).toThrow(DependencyNotFoundException);
  });

  it("produceDependencyTree builds the correct nested shape", () => {
    const tree = resolver.produceDependencyTree(buildGraph(), "strategy_indicator");
    expect(tree.identifier).toBe("strategy_indicator");
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]!.identifier).toBe("macd");
    expect(tree.children[0]!.children).toHaveLength(1);
    expect(tree.children[0]!.children[0]!.identifier).toBe("ema");
    expect(tree.children[0]!.children[0]!.children).toEqual([]);
  });

  it("produceDependencyTree throws for a root identifier not in the graph", () => {
    expect(() => resolver.produceDependencyTree(buildGraph(), "does_not_exist")).toThrow(DependencyNotFoundException);
  });
});
