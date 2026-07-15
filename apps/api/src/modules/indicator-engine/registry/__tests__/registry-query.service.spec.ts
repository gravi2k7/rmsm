import { RegistryQueryService } from "../registry-query.service";
import { IndicatorRegistryService } from "../indicator-registry.service";
import { RegistryValidatorService } from "../registry-validator.service";
import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";

function buildDefinition(overrides: Partial<IndicatorDefinition> = {}): IndicatorDefinition {
  return {
    identifier: "test",
    displayName: "Test",
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

describe("RegistryQueryService", () => {
  let registry: IndicatorRegistryService;
  let query: RegistryQueryService;

  beforeEach(() => {
    registry = new IndicatorRegistryService(new RegistryValidatorService());
    query = new RegistryQueryService(registry);
    registry.register(buildDefinition({ identifier: "ema", category: "TREND", supportedTimeframes: ["ONE_DAY", "ONE_HOUR"], tags: ["moving-average"] }));
    registry.register(buildDefinition({ identifier: "rsi", category: "MOMENTUM", supportedTimeframes: ["ONE_DAY"], tags: ["oscillator"] }));
    registry.register(
      buildDefinition({ identifier: "obv", category: "VOLUME", metadata: { calculationType: "iterative", deterministic: true, cacheable: true, incrementalSupport: false } }),
    );
  });

  it("filters by category", () => {
    expect(query.search({ category: "MOMENTUM" }).map((d) => d.identifier)).toEqual(["rsi"]);
  });

  it("filters by tag", () => {
    expect(query.search({ tags: ["oscillator"] }).map((d) => d.identifier)).toEqual(["rsi"]);
  });

  it("filters by timeframe", () => {
    expect(query.search({ timeframe: "ONE_HOUR" }).map((d) => d.identifier)).toEqual(["ema"]);
  });

  it("filters by capability.calculationType", () => {
    expect(query.search({ capability: { calculationType: "iterative" } }).map((d) => d.identifier)).toEqual(["obv"]);
  });

  it("combines multiple filters (category + timeframe together)", () => {
    expect(query.search({ category: "TREND", timeframe: "ONE_DAY" }).map((d) => d.identifier)).toEqual(["ema"]);
  });

  it("returns everything when no filter is given", () => {
    expect(query.search({})).toHaveLength(3);
  });
});
