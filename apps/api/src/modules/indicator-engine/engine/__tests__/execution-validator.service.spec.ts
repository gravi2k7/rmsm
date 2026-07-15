import { ExecutionValidatorService } from "../execution-validator.service";
import {
  UnsupportedTimeframeException,
  InvalidParameterException,
  CalculationWindowException,
  ExecutionCancelledException,
  ExecutionTimeoutException,
} from "../../contracts/execution.errors";
import type { ExecutionContext } from "../../contracts/execution-context.interface";
import type { ExecutionRequest } from "../../contracts/execution-request.interface";
import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";

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
    minimumLookback: 20,
    dependencies: [],
    tags: [],
    author: "Test",
    stabilityLevel: "stable",
    metadata: { calculationType: "windowed", deterministic: true, cacheable: true, incrementalSupport: false },
    ...overrides,
  };
}

function buildContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    executionId: "exec1",
    indicatorInstance: { instanceId: "ema_20", definitionIdentifier: "ema", definitionVersion: "1.0.0", parameters: { period: 20 }, updateParameters: jest.fn() },
    indicatorDefinition: buildDefinition(),
    marketDataReference: { instrumentId: "inst1", candles: Array(25).fill({ eventTime: new Date() }) },
    timeframe: "ONE_DAY",
    parameters: { period: 20 },
    calculationWindow: { mode: "FULL_RECALCULATION", from: new Date("2026-01-01"), to: new Date("2026-02-01") },
    executionTimestamp: new Date(),
    metadata: {},
    dependencyResults: {},
    ...overrides,
  };
}

describe("ExecutionValidatorService", () => {
  let validator: ExecutionValidatorService;

  beforeEach(() => {
    validator = new ExecutionValidatorService();
  });

  it("accepts a genuinely valid context", () => {
    const context = buildContext();
    expect(() => validator.validateContext(context)).not.toThrow();
    expect(() => validator.validateMarketDataPresence(context)).not.toThrow();
    expect(() => validator.validateTimeframe(context)).not.toThrow();
    expect(() => validator.validateParameters(context)).not.toThrow();
  });

  it("rejects a context missing executionId", () => {
    const context = buildContext({ executionId: "" });
    expect(() => validator.validateContext(context)).toThrow(CalculationWindowException);
  });

  it("rejects empty market data", () => {
    const context = buildContext({ marketDataReference: { instrumentId: "inst1", candles: [] } });
    expect(() => validator.validateMarketDataPresence(context)).toThrow(CalculationWindowException);
  });

  it("rejects market data below minimumLookback", () => {
    const context = buildContext({ marketDataReference: { instrumentId: "inst1", candles: Array(5).fill({ eventTime: new Date() }) } });
    expect(() => validator.validateMarketDataPresence(context)).toThrow(CalculationWindowException);
  });

  it("rejects an unsupported timeframe", () => {
    const context = buildContext({ timeframe: "ONE_HOUR" });
    expect(() => validator.validateTimeframe(context)).toThrow(UnsupportedTimeframeException);
  });

  it("rejects a missing required parameter", () => {
    const context = buildContext({ parameters: {} });
    expect(() => validator.validateParameters(context)).toThrow(InvalidParameterException);
  });

  it("validateLifecycleTransition accepts a valid transition", () => {
    expect(() => validator.validateLifecycleTransition("READY", "EXECUTING")).not.toThrow();
  });

  it("validateLifecycleTransition rejects an invalid transition", () => {
    expect(() => validator.validateLifecycleTransition("REGISTERED", "COMPLETED")).toThrow(CalculationWindowException);
  });

  it("validateNotCancelled rejects an already-aborted signal", () => {
    const controller = new AbortController();
    controller.abort();
    const request = { executionOptions: { cancellationSignal: controller.signal } } as ExecutionRequest;
    expect(() => validator.validateNotCancelled(request)).toThrow(ExecutionCancelledException);
  });

  it("validateNotCancelled accepts a request with no cancellation signal", () => {
    const request = { executionOptions: {} } as ExecutionRequest;
    expect(() => validator.validateNotCancelled(request)).not.toThrow();
  });

  it("validateTimeoutConfiguration rejects a non-positive timeout", () => {
    const request = { executionOptions: { timeoutMs: -1 } } as ExecutionRequest;
    expect(() => validator.validateTimeoutConfiguration(request)).toThrow(ExecutionTimeoutException);
  });

  it("validateTimeoutConfiguration accepts an undefined timeout (no limit)", () => {
    const request = { executionOptions: {} } as ExecutionRequest;
    expect(() => validator.validateTimeoutConfiguration(request)).not.toThrow();
  });
});
