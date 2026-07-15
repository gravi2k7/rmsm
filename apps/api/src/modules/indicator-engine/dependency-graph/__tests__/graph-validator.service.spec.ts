import { GraphValidatorService } from "../graph-validator.service";
import { CycleDetectorService } from "../cycle-detector.service";
import { InvalidGraphException, DependencyNotFoundException, CircularDependencyException } from "../../contracts/graph.errors";
import type { DependencyGraph } from "../../contracts/dependency-graph.interface";

function buildGraph(overrides: Partial<DependencyGraph> = {}): DependencyGraph {
  return {
    graphId: "g1",
    graphVersion: "1.0.0",
    nodes: [{ identifier: "ema", version: "1.0.0" }, { identifier: "macd", version: "1.0.0" }],
    edges: [{ from: "macd", to: "ema", dependencyType: "required", executionPriority: 0, metadata: {} }],
    metadata: { builtAt: new Date(), sourceDefinitionCount: 2 },
    ...overrides,
  };
}

describe("GraphValidatorService", () => {
  let validator: GraphValidatorService;

  beforeEach(() => {
    validator = new GraphValidatorService(new CycleDetectorService());
  });

  it("accepts a genuinely valid graph", () => {
    expect(() => validator.validate(buildGraph())).not.toThrow();
  });

  it("rejects a missing graphId", () => {
    expect(() => validator.validate(buildGraph({ graphId: "" }))).toThrow(InvalidGraphException);
  });

  it("rejects duplicate nodes (same identifier + version twice)", () => {
    const graph = buildGraph({ nodes: [{ identifier: "ema", version: "1.0.0" }, { identifier: "ema", version: "1.0.0" }] });
    expect(() => validator.validate(graph)).toThrow(InvalidGraphException);
  });

  it("allows the same identifier at two DIFFERENT versions (not a duplicate)", () => {
    const graph = buildGraph({
      nodes: [{ identifier: "rdse", version: "1.0.0" }, { identifier: "rdse", version: "2.0.0" }],
      edges: [],
    });
    expect(() => validator.validate(graph)).not.toThrow();
  });

  it("rejects an invalid (non-semver) node version", () => {
    const graph = buildGraph({ nodes: [{ identifier: "ema", version: "not-a-version" }] });
    expect(() => validator.validate(graph)).toThrow(InvalidGraphException);
  });

  it("rejects an edge referencing an unregistered 'to' node (missing dependency)", () => {
    const graph = buildGraph({ edges: [{ from: "macd", to: "does_not_exist", dependencyType: "required", executionPriority: 0, metadata: {} }] });
    expect(() => validator.validate(graph)).toThrow(DependencyNotFoundException);
  });

  it("rejects an edge referencing an unregistered 'from' node", () => {
    const graph = buildGraph({ edges: [{ from: "does_not_exist", to: "ema", dependencyType: "required", executionPriority: 0, metadata: {} }] });
    expect(() => validator.validate(graph)).toThrow(DependencyNotFoundException);
  });

  it("rejects a graph containing a cycle", () => {
    const graph = buildGraph({
      nodes: [{ identifier: "a", version: "1.0.0" }, { identifier: "b", version: "1.0.0" }],
      edges: [
        { from: "a", to: "b", dependencyType: "required", executionPriority: 0, metadata: {} },
        { from: "b", to: "a", dependencyType: "required", executionPriority: 0, metadata: {} },
      ],
    });
    expect(() => validator.validate(graph)).toThrow(CircularDependencyException);
  });
});
