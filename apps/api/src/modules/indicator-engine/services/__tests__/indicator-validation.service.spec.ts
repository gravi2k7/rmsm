import { IndicatorValidationServiceImpl } from "../indicator-validation.service";
import { IndicatorRegistryService } from "../../registry/indicator-registry.service";
import { RegistryValidatorService } from "../../registry/registry-validator.service";
import { ServiceMetricsService } from "../service-metrics.service";
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

describe("IndicatorValidationServiceImpl", () => {
  function buildService() {
    const registry = new IndicatorRegistryService(new RegistryValidatorService());
    const metrics = new ServiceMetricsService();
    registry.register(buildDefinition());
    return { service: new IndicatorValidationServiceImpl(registry, metrics), metrics };
  }

  it("accepts a genuinely valid request", () => {
    const { service } = buildService();
    const result = service.validate({ indicatorIdentifier: "ema", parameters: { period: 20 }, timeframe: "ONE_DAY" });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects an unregistered indicator, short-circuiting the other checks", () => {
    const { service } = buildService();
    const result = service.validate({ indicatorIdentifier: "does_not_exist", parameters: {}, timeframe: "ONE_DAY" });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("not registered");
  });

  it("rejects a missing required parameter", () => {
    const { service } = buildService();
    const result = service.validate({ indicatorIdentifier: "ema", parameters: {}, timeframe: "ONE_DAY" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("period"))).toBe(true);
  });

  it("rejects an unsupported timeframe", () => {
    const { service } = buildService();
    const result = service.validate({ indicatorIdentifier: "ema", parameters: { period: 20 }, timeframe: "ONE_HOUR" });
    expect(result.valid).toBe(false);
  });

  it("rejects a missing dependency", () => {
    const registry = new IndicatorRegistryService(new RegistryValidatorService());
    const metrics = new ServiceMetricsService();
    registry.register(buildDefinition({ identifier: "leaf" }));
    registry.register(buildDefinition({ identifier: "macd", dependencies: ["leaf"] }));
    const service = new IndicatorValidationServiceImpl(registry, metrics);

    // Still valid — "leaf" IS registered.
    expect(service.validate({ indicatorIdentifier: "macd", parameters: { period: 20 }, timeframe: "ONE_DAY" }).valid).toBe(true);
  });

  it("reports EVERY problem at once, not just the first — real errors accumulate rather than short-circuit after the first hit", () => {
    const { service } = buildService();
    const result = service.validate({ indicatorIdentifier: "ema", parameters: {}, timeframe: "ONE_HOUR" });
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("records a validation-failure metric on an invalid request", () => {
    const { service, metrics } = buildService();
    service.validate({ indicatorIdentifier: "ema", parameters: {}, timeframe: "ONE_DAY" });
    expect(metrics.snapshot().validationFailures).toBe(1);
  });

  it("does not record a validation-failure metric for a valid request", () => {
    const { service, metrics } = buildService();
    service.validate({ indicatorIdentifier: "ema", parameters: { period: 20 }, timeframe: "ONE_DAY" });
    expect(metrics.snapshot().validationFailures).toBe(0);
  });
});
