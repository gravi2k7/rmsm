import { ComputationEngineService } from "../computation-engine.service";
import { IndicatorRegistryService } from "../../registry/indicator-registry.service";
import { RegistryValidatorService } from "../../registry/registry-validator.service";
import { IndicatorFactoryService } from "../../registry/indicator-factory.service";
import { ExecutionValidatorService } from "../execution-validator.service";
import { ExecutionMetricsService } from "../execution-metrics.service";
import type { MarketDataService } from "../../../market-data/services/market-data.service";
import type { ExecutionRequest } from "../../contracts/execution-request.interface";
import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";
import type { Indicator } from "../../contracts/indicator.interface";

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

function buildRequest(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
  return {
    indicatorInstance: { instanceId: "ema_20", definitionIdentifier: "ema", definitionVersion: "1.0.0", parameters: { period: 20 }, updateParameters: jest.fn() },
    timeframe: "ONE_DAY",
    marketDataReference: { instrumentId: "inst1" },
    calculationWindow: { mode: "FULL_RECALCULATION", from: new Date("2026-01-01"), to: new Date("2026-02-01") },
    executionOptions: {},
    ...overrides,
  };
}

describe("ComputationEngineService", () => {
  function buildEngine(candles: unknown[] = Array(10).fill({ eventTime: new Date() })) {
    const registry = new IndicatorRegistryService(new RegistryValidatorService());
    const factory = new IndicatorFactoryService();
    const marketDataService = { getCandles: jest.fn().mockResolvedValue(candles) } as unknown as MarketDataService;
    const validator = new ExecutionValidatorService();
    const metrics = new ExecutionMetricsService();
    const engine = new ComputationEngineService(registry, factory, marketDataService, validator, metrics);
    return { engine, registry, factory, marketDataService, metrics };
  }

  it("fails with IndicatorNotFoundException's message when no calculate() implementation is registered — the honest outcome for every real indicator this phase", async () => {
    const { engine, registry } = buildEngine();
    registry.register(buildDefinition());

    const result = await engine.execute(buildRequest());

    expect(result.lifecycleStatus).toBe("FAILED");
    expect(result.errors[0]).toContain("No calculation implementation is registered");
  });

  it("fails fast with a clear message for a definition with dependencies, WITHOUT calling AI-101 at all — dependency execution is Phase 2C's job", async () => {
    const { engine, registry, marketDataService } = buildEngine();
    registry.register(buildDefinition({ identifier: "ema" }));
    registry.register(buildDefinition({ identifier: "macd", dependencies: ["ema"] }));

    const result = await engine.execute(buildRequest({ indicatorInstance: { instanceId: "macd_1", definitionIdentifier: "macd", definitionVersion: "1.0.0", parameters: {}, updateParameters: jest.fn() } }));

    expect(result.lifecycleStatus).toBe("FAILED");
    expect(result.errors[0]).toContain("dependency execution is Phase 2C's job");
    expect(marketDataService.getCandles).not.toHaveBeenCalled();
  });

  it("fails when AI-101 returns insufficient candle history", async () => {
    const { engine, registry } = buildEngine([{ eventTime: new Date() }]); // only 1, definition needs 5
    registry.register(buildDefinition());

    const result = await engine.execute(buildRequest());

    expect(result.lifecycleStatus).toBe("FAILED");
    expect(result.errors[0]).toMatch(/requires at least/);
  });

  it("succeeds end to end when a real calculate() implementation IS registered — the full pipeline genuinely works", async () => {
    const { engine, registry, factory, metrics } = buildEngine();
    registry.register(buildDefinition());

    const fakeIndicator: Indicator = {
      definition: buildDefinition(),
      calculate: jest.fn().mockReturnValue({
        indicatorIdentifier: "ema",
        indicatorVersion: "1.0.0",
        instrumentId: "inst1",
        timeframe: "ONE_DAY",
        parameters: { period: 20 },
        series: { value: [{ eventTime: new Date(), value: "100.5" }] },
        computedAt: new Date(),
      }),
    };
    factory.registerBuilder("ema", () => fakeIndicator);

    const result = await engine.execute(buildRequest());

    expect(result.lifecycleStatus).toBe("COMPLETED");
    expect(result.producedValues?.series.value).toHaveLength(1);
    expect(result.errors).toEqual([]);
    expect(fakeIndicator.calculate).toHaveBeenCalledTimes(1);
    expect(metrics.snapshot().totalExecutions).toBe(1);
  });

  it("passes a genuinely frozen (immutable) ExecutionContext to calculate()", async () => {
    const { engine, registry, factory } = buildEngine();
    registry.register(buildDefinition());

    let capturedContext: unknown;
    factory.registerBuilder("ema", () => ({
      definition: buildDefinition(),
      calculate: (context: unknown) => {
        capturedContext = context;
        return { indicatorIdentifier: "ema", indicatorVersion: "1.0.0", instrumentId: "inst1", timeframe: "ONE_DAY", parameters: {}, series: {}, computedAt: new Date() };
      },
    }));

    await engine.execute(buildRequest());

    expect(Object.isFrozen(capturedContext)).toBe(true);
  });

  it("result carries the correct indicatorInstanceId and calculation mode metadata", async () => {
    const { engine, registry, factory } = buildEngine();
    registry.register(buildDefinition());
    factory.registerBuilder("ema", () => ({
      definition: buildDefinition(),
      calculate: () => ({ indicatorIdentifier: "ema", indicatorVersion: "1.0.0", instrumentId: "inst1", timeframe: "ONE_DAY", parameters: {}, series: {}, computedAt: new Date() }),
    }));

    const result = await engine.execute(buildRequest());

    expect(result.indicatorInstanceId).toBe("ema_20");
    expect(result.calculationMetadata.mode).toBe("FULL_RECALCULATION");
  });

  it("rejects an already-cancelled request before ever calling AI-101", async () => {
    const { engine, registry, marketDataService } = buildEngine();
    registry.register(buildDefinition());
    const controller = new AbortController();
    controller.abort();

    const result = await engine.execute(buildRequest({ executionOptions: { cancellationSignal: controller.signal } }));

    expect(result.lifecycleStatus).toBe("FAILED");
    expect(marketDataService.getCandles).not.toHaveBeenCalled();
  });
});
