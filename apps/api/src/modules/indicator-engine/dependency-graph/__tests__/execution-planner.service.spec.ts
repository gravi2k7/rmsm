import { ExecutionPlannerService } from "../execution-planner.service";
import { TopologicalSorterService } from "../topological-sorter.service";
import { DependencyResolverService } from "../dependency-resolver.service";
import type { DependencyGraph } from "../../contracts/dependency-graph.interface";
import type { IndicatorRequest } from "../../contracts/execution-planner.interface";

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

function buildRequest(overrides: Partial<IndicatorRequest> = {}): IndicatorRequest {
  return { indicatorIdentifier: "strategy_indicator", calculationMode: "FULL_RECALCULATION", cancellable: true, ...overrides };
}

describe("ExecutionPlannerService", () => {
  let planner: ExecutionPlannerService;

  beforeEach(() => {
    planner = new ExecutionPlannerService(new TopologicalSorterService(), new DependencyResolverService());
  });

  it("produces a plan with the correct dependency-respecting execution order", () => {
    const plan = planner.createPlan(buildGraph(), buildRequest());
    expect(plan.executionOrder.map((s) => s.identifier)).toEqual(["ema", "macd", "strategy_indicator"]);
  });

  it("assigns a correct, 0-indexed order field to each step", () => {
    const plan = planner.createPlan(buildGraph(), buildRequest());
    expect(plan.executionOrder.map((s) => s.order)).toEqual([0, 1, 2]);
  });

  it("carries the requested calculationMode through to the plan", () => {
    const plan = planner.createPlan(buildGraph(), buildRequest({ calculationMode: "LIVE_BAR" }));
    expect(plan.calculationMode).toBe("LIVE_BAR");
  });

  it("carries timeout and cancellation policy through from the request", () => {
    const plan = planner.createPlan(buildGraph(), buildRequest({ timeoutMs: 5000, cancellable: false }));
    expect(plan.executionMetadata.timeoutPolicy.timeoutMs).toBe(5000);
    expect(plan.executionMetadata.cancellationPolicy.cancellable).toBe(false);
  });

  it("builds a real, non-trivial dependency tree", () => {
    const plan = planner.createPlan(buildGraph(), buildRequest());
    expect(plan.dependencyTree.identifier).toBe("strategy_indicator");
    expect(plan.dependencyTree.children[0]!.identifier).toBe("macd");
  });

  it("the recommended Execution Complexity Estimator: nodeCount and dependencyDepth are real, computed values", () => {
    const plan = planner.createPlan(buildGraph(), buildRequest());
    expect(plan.estimatedComplexity.nodeCount).toBe(3);
    expect(plan.estimatedComplexity.dependencyDepth).toBe(3);
    expect(plan.estimatedComplexity.estimatedComputationCost).toBe(9);
  });

  it("produces a genuinely frozen (immutable) plan", () => {
    const plan = planner.createPlan(buildGraph(), buildRequest());
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.executionOrder)).toBe(true);
  });

  it("a leaf indicator (no dependencies) produces a single-step plan", () => {
    const graph = buildGraph();
    const plan = planner.createPlan(graph, buildRequest({ indicatorIdentifier: "ema" }));
    expect(plan.executionOrder.map((s) => s.identifier)).toEqual(["ema"]);
    expect(plan.estimatedComplexity.parallelizationOpportunities).toEqual([["ema"]]);
  });
});
