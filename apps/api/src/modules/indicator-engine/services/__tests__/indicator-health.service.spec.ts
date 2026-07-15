import { IndicatorHealthService } from "../indicator-health.service";
import { IndicatorRegistryService } from "../../registry/indicator-registry.service";
import { RegistryValidatorService } from "../../registry/registry-validator.service";
import { DependencyGraphBuilderService } from "../../dependency-graph/dependency-graph-builder.service";
import { GraphValidatorService } from "../../dependency-graph/graph-validator.service";
import { CycleDetectorService } from "../../dependency-graph/cycle-detector.service";
import { TopologicalSorterService } from "../../dependency-graph/topological-sorter.service";
import { DependencyResolverService } from "../../dependency-graph/dependency-resolver.service";
import { ExecutionPlannerService } from "../../dependency-graph/execution-planner.service";
import { IndicatorLifecycleServiceImpl } from "../indicator-lifecycle.service";
import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";

function buildDefinition(overrides: Partial<IndicatorDefinition> = {}): IndicatorDefinition {
  return {
    identifier: "ema",
    displayName: "EMA",
    version: "1.0.0",
    description: "Test",
    category: "TREND",
    inputs: [],
    outputs: [{ name: "value", kind: "line" }],
    defaultParameters: {},
    supportedTimeframes: ["ONE_DAY"],
    minimumLookback: 1,
    dependencies: [],
    tags: [],
    author: "Test",
    stabilityLevel: "stable",
    metadata: { calculationType: "windowed", deterministic: true, cacheable: true, incrementalSupport: false },
    ...overrides,
  };
}

describe("IndicatorHealthService (real functional checks)", () => {
  function buildService() {
    const registry = new IndicatorRegistryService(new RegistryValidatorService());
    const graphBuilder = new DependencyGraphBuilderService(registry);
    const graphValidator = new GraphValidatorService(new CycleDetectorService());
    const planner = new ExecutionPlannerService(new TopologicalSorterService(), new DependencyResolverService());
    const lifecycle = new IndicatorLifecycleServiceImpl();
    lifecycle.onModuleInit();
    const service = new IndicatorHealthService(registry, graphBuilder, graphValidator, planner, lifecycle);
    return { service, registry, lifecycle };
  }

  it("reports status: ok when a real leaf indicator exists and the full graph/plan cycle succeeds", () => {
    const { service, registry } = buildService();
    registry.register(buildDefinition());
    const result = service.check();
    expect(result.status).toBe("ok");
    expect(result.registryStatus).toBe("ok");
    expect(result.dependencyGraphStatus).toBe("ok");
    expect(result.plannerStatus).toBe("ok");
  });

  it("reports registryStatus: error and overall degraded when the registry is genuinely empty", () => {
    const { service } = buildService();
    const result = service.check();
    expect(result.registryStatus).toBe("error");
    expect(result.status).toBe("degraded");
  });

  it("reports the real service lifecycle state", () => {
    const { service, registry, lifecycle } = buildService();
    registry.register(buildDefinition());
    lifecycle.markExecuting();
    expect(service.check().serviceReadiness).toBe("EXECUTING");
  });

  it("real end-to-end: builds a graph, validates it, and generates a real plan against an actual leaf node — not a hardcoded true", () => {
    const { service, registry } = buildService();
    registry.register(buildDefinition({ identifier: "atr", dependencies: [] }));
    registry.register(buildDefinition({ identifier: "supertrend", dependencies: ["atr"] }));
    const result = service.check();
    // supertrend has a dependency, so it wouldn't be picked as the leaf
    // — atr (no dependencies) is, and the plan/graph cycle against it
    // must genuinely succeed for this to report ok.
    expect(result.dependencyGraphStatus).toBe("ok");
    expect(result.plannerStatus).toBe("ok");
  });
});
