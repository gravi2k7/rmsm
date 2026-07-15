import { IndicatorInstance } from "../indicator-instance";
import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";

function buildDefinition(): IndicatorDefinition {
  return {
    identifier: "ema",
    displayName: "EMA",
    version: "1.0.0",
    description: "Test",
    category: "TREND",
    inputs: [],
    outputs: [{ name: "value", kind: "line" }],
    defaultParameters: { period: 20, source: "close" },
    supportedTimeframes: ["ONE_DAY"],
    minimumLookback: 20,
    dependencies: [],
    tags: [],
    author: "Test",
    stabilityLevel: "stable",
    metadata: { calculationType: "windowed", deterministic: true, cacheable: true, incrementalSupport: true },
  };
}

describe("IndicatorInstance", () => {
  it("starts with the definition's default parameters when no overrides are given", () => {
    const instance = new IndicatorInstance(buildDefinition());
    expect(instance.parameters).toEqual({ period: 20, source: "close" });
  });

  it("layers parameter overrides on top of the definition's defaults at construction", () => {
    const instance = new IndicatorInstance(buildDefinition(), { period: 50 });
    expect(instance.parameters).toEqual({ period: 50, source: "close" });
  });

  it("pins definitionIdentifier and definitionVersion from the definition it was created from", () => {
    const instance = new IndicatorInstance(buildDefinition());
    expect(instance.definitionIdentifier).toBe("ema");
    expect(instance.definitionVersion).toBe("1.0.0");
  });

  it("generates a unique instanceId when none is given", () => {
    const a = new IndicatorInstance(buildDefinition());
    const b = new IndicatorInstance(buildDefinition());
    expect(a.instanceId).not.toBe(b.instanceId);
  });

  it("accepts an explicit instanceId (e.g. a human-readable one like 'ema_20')", () => {
    const instance = new IndicatorInstance(buildDefinition(), { period: 20 }, "ema_20");
    expect(instance.instanceId).toBe("ema_20");
  });

  it("supports multiple independent instances of the same definition — EMA(20) and EMA(50)", () => {
    const definition = buildDefinition();
    const ema20 = new IndicatorInstance(definition, { period: 20 }, "ema_20");
    const ema50 = new IndicatorInstance(definition, { period: 50 }, "ema_50");
    expect(ema20.parameters.period).toBe(20);
    expect(ema50.parameters.period).toBe(50);
  });

  it("updateParameters() mutates the instance's own parameters — the instance is a runtime object, not immutable", () => {
    const instance = new IndicatorInstance(buildDefinition());
    instance.updateParameters({ period: 100 });
    expect(instance.parameters.period).toBe(100);
  });

  it("updateParameters() is a partial merge — unnamed parameters keep their current value", () => {
    const instance = new IndicatorInstance(buildDefinition());
    instance.updateParameters({ period: 100 });
    expect(instance.parameters.source).toBe("close");
  });

  it("mutating an instance never affects the definition it was built from — definitions stay immutable", () => {
    const definition = buildDefinition();
    const instance = new IndicatorInstance(definition);
    instance.updateParameters({ period: 999 });
    expect(definition.defaultParameters.period).toBe(20);
  });
});
