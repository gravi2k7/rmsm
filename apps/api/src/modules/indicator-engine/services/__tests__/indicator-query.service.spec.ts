import { IndicatorQueryServiceImpl } from "../indicator-query.service";
import { IndicatorRegistryService } from "../../registry/indicator-registry.service";
import { RegistryQueryService } from "../../registry/registry-query.service";
import { RegistryValidatorService } from "../../registry/registry-validator.service";
import { IndicatorServiceException } from "../../contracts/service.errors";
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
    tags: ["moving-average"],
    author: "Test",
    stabilityLevel: "stable",
    metadata: { calculationType: "windowed", deterministic: true, cacheable: true, incrementalSupport: false },
    ...overrides,
  };
}

describe("IndicatorQueryServiceImpl", () => {
  function buildService() {
    const registry = new IndicatorRegistryService(new RegistryValidatorService());
    const query = new RegistryQueryService(registry);
    registry.register(buildDefinition({ identifier: "ema", category: "TREND" }));
    registry.register(buildDefinition({ identifier: "rsi", category: "MOMENTUM", tags: ["oscillator"] }));
    return new IndicatorQueryServiceImpl(registry, query);
  }

  it("list() returns every registered indicator when no filter is given", () => {
    const service = buildService();
    const result = service.list({});
    expect(result.totalCount).toBe(2);
  });

  it("list() filters by category", () => {
    const service = buildService();
    const result = service.list({ category: "MOMENTUM" });
    expect(result.indicators.map((d) => d.identifier)).toEqual(["rsi"]);
  });

  it("lookup() returns the definition for a registered identifier", () => {
    const service = buildService();
    expect(service.lookup("ema").definition.identifier).toBe("ema");
  });

  it("lookup() throws IndicatorServiceException for an unregistered identifier", () => {
    const service = buildService();
    expect(() => service.lookup("does_not_exist")).toThrow(IndicatorServiceException);
  });

  it("listCategories() returns every distinct category actually registered", () => {
    const service = buildService();
    expect(service.listCategories().sort()).toEqual(["MOMENTUM", "TREND"]);
  });

  it("listVersions() returns every registered version of one identifier", () => {
    const registry = new IndicatorRegistryService(new RegistryValidatorService());
    const query = new RegistryQueryService(registry);
    registry.register(buildDefinition({ identifier: "rdse", version: "1.0.0", category: "CUSTOM" }));
    registry.register(buildDefinition({ identifier: "rdse", version: "2.0.0", category: "CUSTOM" }));
    const service = new IndicatorQueryServiceImpl(registry, query);
    expect(service.listVersions("rdse")).toEqual(["1.0.0", "2.0.0"]);
  });

  it("inspectParameters() returns the definition's own inputs", () => {
    const service = buildService();
    expect(service.inspectParameters("ema")).toHaveLength(1);
    expect(service.inspectParameters("ema")[0]!.name).toBe("period");
  });
});
