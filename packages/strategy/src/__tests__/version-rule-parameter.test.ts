import { describe, expect, it } from "vitest";
import { StrategyRule } from "../entities/strategy-rule";
import { StrategyParameter } from "../entities/strategy-parameter";
import { StrategyVersion } from "../entities/strategy-version";
import { StrategyTemplate } from "../entities/strategy-template";
import { ParameterValue } from "../value-objects/parameter-value";
import { RiskProfile } from "../value-objects/risk-profile";

describe("StrategyRule", () => {
  it("defaults enabled to true", () => {
    const rule = StrategyRule.create("r1", { kind: "ENTRY", description: "RSI oversold", expression: "rsi < 30", order: 1 });
    expect(rule.enabled).toBe(true);
  });

  it("enable()/disable() toggle state", () => {
    const rule = StrategyRule.create("r1", { kind: "ENTRY", description: "x", expression: "x", order: 1, enabled: false });
    expect(rule.enabled).toBe(false);
    rule.enable();
    expect(rule.enabled).toBe(true);
    rule.disable();
    expect(rule.enabled).toBe(false);
  });

  it("rejects an empty expression", () => {
    expect(() => StrategyRule.create("r1", { kind: "ENTRY", description: "x", expression: "", order: 1 })).toThrow();
  });
});

describe("StrategyParameter", () => {
  function lookback() {
    const value = ParameterValue.create("lookback", "integer", 14);
    if (!value.ok) throw new Error("fixture failed");
    return StrategyParameter.create("p1", { name: "lookback", type: "integer", defaultValue: value.value, required: true, min: 1, max: 100 });
  }

  it("accepts a value within range", () => {
    const inRange = ParameterValue.create("lookback", "integer", 50);
    expect(inRange.ok && lookback().accepts(inRange.value)).toBe(true);
  });

  it("rejects a value outside range", () => {
    const outOfRange = ParameterValue.create("lookback", "integer", 500);
    expect(outOfRange.ok && lookback().accepts(outOfRange.value)).toBe(false);
  });

  it("rejects a value of the wrong type", () => {
    const wrongType = ParameterValue.create("lookback", "decimal", 1.5);
    expect(wrongType.ok && lookback().accepts(wrongType.value)).toBe(false);
  });

  it("rejects min > max at construction", () => {
    const value = ParameterValue.create("x", "integer", 5);
    expect(value.ok).toBe(true);
    if (value.ok) {
      expect(() => StrategyParameter.create("p1", { name: "x", type: "integer", defaultValue: value.value, required: true, min: 10, max: 1 })).toThrow();
    }
  });

  it("enum parameter accepts only allowed values", () => {
    const defaultValue = ParameterValue.create("mode", "enum", "fast");
    expect(defaultValue.ok).toBe(true);
    if (!defaultValue.ok) return;
    const param = StrategyParameter.create("p2", { name: "mode", type: "enum", defaultValue: defaultValue.value, required: true, allowedValues: ["fast", "slow"] });
    const valid = ParameterValue.create("mode", "enum", "slow");
    const invalid = ParameterValue.create("mode", "enum", "medium");
    expect(valid.ok && param.accepts(valid.value)).toBe(true);
    expect(invalid.ok && param.accepts(invalid.value)).toBe(false);
  });
});

describe("StrategyVersion", () => {
  function buildVersion() {
    const entry = StrategyRule.create("r1", { kind: "ENTRY", description: "x", expression: "x", order: 1 });
    const exit = StrategyRule.create("r2", { kind: "EXIT", description: "y", expression: "y", order: 2 });
    return StrategyVersion.create("v1", { versionNumber: 1, rules: [entry, exit], parameters: [], createdAt: new Date() });
  }

  it("starts in DRAFT status", () => {
    expect(buildVersion().status).toBe("DRAFT");
  });

  it("separates entryRules and exitRules by kind", () => {
    const version = buildVersion();
    expect(version.entryRules).toHaveLength(1);
    expect(version.exitRules).toHaveLength(1);
  });

  it("activate()/deprecate() transition status", () => {
    const version = buildVersion();
    version.activate();
    expect(version.status).toBe("ACTIVE");
    version.deprecate();
    expect(version.status).toBe("DEPRECATED");
  });

  it("rejects versionNumber below 1", () => {
    expect(() => StrategyVersion.create("v1", { versionNumber: 0, rules: [], parameters: [], createdAt: new Date() })).toThrow();
  });
});

describe("StrategyTemplate", () => {
  it("exposes its own defaults", () => {
    const template = StrategyTemplate.create("t1", {
      name: "MA Crossover Template",
      description: "x",
      defaultRules: [],
      defaultParameters: [],
      defaultRiskProfile: RiskProfile.conservative(),
    });
    expect(template.name).toBe("MA Crossover Template");
    expect(template.defaultRiskProfile.tolerance).toBe("LOW");
  });
});
