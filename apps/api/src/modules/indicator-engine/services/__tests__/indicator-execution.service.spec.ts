import { IndicatorExecutionServiceImpl } from "../indicator-execution.service";
import { IndicatorRegistryService } from "../../registry/indicator-registry.service";
import { RegistryValidatorService } from "../../registry/registry-validator.service";
import { IndicatorFactoryService } from "../../registry/indicator-factory.service";
import { DependencyGraphBuilderService } from "../../dependency-graph/dependency-graph-builder.service";
import { GraphValidatorService } from "../../dependency-graph/graph-validator.service";
import { CycleDetectorService } from "../../dependency-graph/cycle-detector.service";
import { TopologicalSorterService } from "../../dependency-graph/topological-sorter.service";
import { DependencyResolverService } from "../../dependency-graph/dependency-resolver.service";
import { ExecutionPlannerService } from "../../dependency-graph/execution-planner.service";
import { ComputationEngineService } from "../../engine/computation-engine.service";
import { ExecutionValidatorService } from "../../engine/execution-validator.service";
import { ExecutionMetricsService } from "../../engine/execution-metrics.service";
import { ServiceMetricsService } from "../service-metrics.service";
import { ExecutionServiceException } from "../../contracts/service.errors";
import type { MarketDataService } from "../../../market-data/services/market-data.service";
import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";
import type { ExecuteIndicatorRequest } from "../../contracts/service-models.interface";

function buildDefinition(overrides: Partial<IndicatorDefinition> = {}): IndicatorDefinition {
  return {
    identifier: "ema",
    displayName: "EMA",
    version: "1.0.0",
    description: "Test",
    category: "TREND",
    inputs: [{ type: "integer", name: "period", required: true, defaultValue: 20, min: 1, max: 500 }],
    outputs: [{ name: "value", kind: "line" }],
    defaultParameters: { period: 20 },
    supportedTimeframes: ["ONE_DAY"],
    minimumLookback: 5,
    dependencies: [],
    tags: [],
    author: "Test",
    stabilityLevel: "stable",
    metadata: { calculationType: "windowed", deterministic: true, cacheable: true, incrementalSupport: false },
    ...overrides,
  };
}

function buildRequest(overrides: Partial<ExecuteIndicatorRequest> = {}): ExecuteIndicatorRequest {
  return {
    indicatorIdentifier: "ema",
    instrumentId: "inst1",
    timeframe: "ONE_DAY",
    parameters: { period: 20 },
    calculationMode: "FULL_RECALCULATION",
    from: "2026-01-01T00:00:00Z",
    to: "2026-02-01T00:00:00Z",
    ...overrides,
  };
}

describe("IndicatorExecutionServiceImpl (real end-to-end plan-walking integration)", () => {
  function buildService(candles: unknown[] = Array(10).fill({ eventTime: new Date() })) {
    const registry = new IndicatorRegistryService(new RegistryValidatorService());
    const factory = new IndicatorFactoryService();
    const marketDataService = { getCandles: jest.fn().mockResolvedValue(candles) } as unknown as MarketDataService;
    const graphBuilder = new DependencyGraphBuilderService(registry);
    const cycleDetector = new CycleDetectorService();
    const graphValidator = new GraphValidatorService(cycleDetector);
    const sorter = new TopologicalSorterService();
    const resolver = new DependencyResolverService();
    const planner = new ExecutionPlannerService(sorter, resolver);
    const executionValidator = new ExecutionValidatorService();
    const executionMetrics = new ExecutionMetricsService();
    const computationEngine = new ComputationEngineService(registry, factory, marketDataService, executionValidator, executionMetrics);
    const serviceMetrics = new ServiceMetricsService();
    const service = new IndicatorExecutionServiceImpl(registry, graphBuilder, graphValidator, planner, computationEngine, serviceMetrics);
    return { service, registry, factory, marketDataService, serviceMetrics };
  }

  it("executes a leaf indicator (no dependencies) end to end when a real calculate() is registered", async () => {
    const { service, registry, factory } = buildService();
    registry.register(buildDefinition());
    factory.registerBuilder("ema", () => ({
      definition: buildDefinition(),
      calculate: () => ({ indicatorIdentifier: "ema", indicatorVersion: "1.0.0", instrumentId: "inst1", timeframe: "ONE_DAY", parameters: {}, series: { value: [{ eventTime: new Date(), value: "1" }] }, computedAt: new Date() }),
    }));

    const response = await service.execute(buildRequest());

    expect(response.summary.status).toBe("COMPLETED");
    expect(response.result?.producedValues?.series.value).toHaveLength(1);
    expect(response.summary.stepCount).toBe(1);
  });

  it("THE critical case: a dependency-bearing indicator (MACD-shaped) executes end to end, feeding EMA's real result into MACD's own context", async () => {
    const { service, registry, factory } = buildService();
    registry.register(buildDefinition({ identifier: "ema" }));
    registry.register(buildDefinition({ identifier: "macd", dependencies: ["ema"], inputs: [] , defaultParameters: {} }));

    let macdSawEmaResult = false;
    factory.registerBuilder("ema", () => ({
      definition: buildDefinition({ identifier: "ema" }),
      calculate: () => ({ indicatorIdentifier: "ema", indicatorVersion: "1.0.0", instrumentId: "inst1", timeframe: "ONE_DAY", parameters: {}, series: { value: [{ eventTime: new Date(), value: "100" }] }, computedAt: new Date() }),
    }));
    factory.registerBuilder("macd", () => ({
      definition: buildDefinition({ identifier: "macd", dependencies: ["ema"], inputs: [], defaultParameters: {} }),
      calculate: (context) => {
        macdSawEmaResult = context.dependencyResults.ema?.series.value?.[0]?.value === "100";
        return { indicatorIdentifier: "macd", indicatorVersion: "1.0.0", instrumentId: "inst1", timeframe: "ONE_DAY", parameters: {}, series: { macd: [{ eventTime: new Date(), value: "5" }] }, computedAt: new Date() };
      },
    }));

    const response = await service.execute(buildRequest({ indicatorIdentifier: "macd", parameters: {} }));

    expect(macdSawEmaResult).toBe(true);
    expect(response.summary.status).toBe("COMPLETED");
    expect(response.summary.stepCount).toBe(2);
    expect(response.stepResults.ema?.lifecycleStatus).toBe("COMPLETED");
    expect(response.stepResults.macd?.lifecycleStatus).toBe("COMPLETED");
  });

  it("aborts cleanly (not a crash) when a step in the plan fails — no calculate() registered for the leaf dependency", async () => {
    const { service, registry } = buildService();
    registry.register(buildDefinition({ identifier: "ema" }));
    registry.register(buildDefinition({ identifier: "macd", dependencies: ["ema"], inputs: [], defaultParameters: {} }));
    // No factory builder registered for "ema" at all — the honest,
    // unresolved-calculation outcome from Phase 2B/2C, still real here.

    const response = await service.execute(buildRequest({ indicatorIdentifier: "macd", parameters: {} }));

    expect(response.summary.status).toBe("FAILED");
    expect(response.summary.stepCount).toBe(1); // aborted after the first (failing) step, never reached macd
    expect(response.errors[0]).toContain("No calculation implementation is registered");
  });

  it("throws ExecutionServiceException when planning itself fails (e.g. requesting an unregistered root)", async () => {
    const { service } = buildService();
    await expect(service.execute(buildRequest({ indicatorIdentifier: "does_not_exist" }))).rejects.toThrow(ExecutionServiceException);
  });

  it("records real service metrics across the full flow", async () => {
    const { service, registry, factory, serviceMetrics } = buildService();
    registry.register(buildDefinition());
    factory.registerBuilder("ema", () => ({
      definition: buildDefinition(),
      calculate: () => ({ indicatorIdentifier: "ema", indicatorVersion: "1.0.0", instrumentId: "inst1", timeframe: "ONE_DAY", parameters: {}, series: {}, computedAt: new Date() }),
    }));

    await service.execute(buildRequest());

    const snapshot = serviceMetrics.snapshot();
    expect(snapshot.requestCount).toBe(1);
    expect(snapshot.successfulExecutions).toBe(1);
  });

  it("Phase 5: emits a structured log line on SUCCESS including requestId, executionId, graphId, indicatorId, durationMs, and status — not just on failure (the original implementation's own real gap)", async () => {
    const { service, registry, factory } = buildService();
    registry.register(buildDefinition());
    factory.registerBuilder("ema", () => ({
      definition: buildDefinition(),
      calculate: () => ({ indicatorIdentifier: "ema", indicatorVersion: "1.0.0", instrumentId: "inst1", timeframe: "ONE_DAY", parameters: {}, series: {}, computedAt: new Date() }),
    }));
    const logSpy = jest.spyOn((service as unknown as { logger: { log: (msg: string) => void } }).logger, "log");

    await service.execute(buildRequest({ requestId: "correlation-abc-123" }));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("requestId=correlation-abc-123"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/executionId=[\w-]+/));
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/graphId=[\w-]+/));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("indicatorId=ema"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/durationMs=\d+/));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("status=COMPLETED"));
  });

  it("Phase 5: falls back to requestId=none, not a crash or an empty string, when no requestId was supplied", async () => {
    const { service, registry, factory } = buildService();
    registry.register(buildDefinition());
    factory.registerBuilder("ema", () => ({
      definition: buildDefinition(),
      calculate: () => ({ indicatorIdentifier: "ema", indicatorVersion: "1.0.0", instrumentId: "inst1", timeframe: "ONE_DAY", parameters: {}, series: {}, computedAt: new Date() }),
    }));
    const logSpy = jest.spyOn((service as unknown as { logger: { log: (msg: string) => void } }).logger, "log");

    await service.execute(buildRequest());

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("requestId=none"));
  });
});
