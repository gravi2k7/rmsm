import { describe, expect, it } from "vitest";
import { StrategyId } from "../value-objects/strategy-id";
import { ParameterValue } from "../value-objects/parameter-value";
import { RiskProfile } from "../value-objects/risk-profile";

describe("StrategyId", () => {
  it("accepts a valid UUID", () => {
    expect(StrategyId.create("123e4567-e89b-12d3-a456-426614174000").ok).toBe(true);
  });
  it("rejects a non-UUID string", () => {
    expect(StrategyId.create("not-a-uuid").ok).toBe(false);
  });
});

describe("ParameterValue", () => {
  it("accepts an integer value for type 'integer'", () => {
    expect(ParameterValue.create("lookback", "integer", 14).ok).toBe(true);
  });
  it("rejects a non-integer number for type 'integer'", () => {
    expect(ParameterValue.create("lookback", "integer", 14.5).ok).toBe(false);
  });
  it("accepts a decimal for type 'decimal'", () => {
    expect(ParameterValue.create("threshold", "decimal", 0.5).ok).toBe(true);
  });
  it("rejects a string for type 'boolean'", () => {
    expect(ParameterValue.create("flag", "boolean", "true").ok).toBe(false);
  });
  it("accepts a non-empty string for type 'string'", () => {
    expect(ParameterValue.create("label", "string", "x").ok).toBe(true);
  });
  it("rejects an empty string for type 'enum'", () => {
    expect(ParameterValue.create("mode", "enum", "").ok).toBe(false);
  });
  it("asNumber() returns the numeric value", () => {
    const result = ParameterValue.create("lookback", "integer", 14);
    expect(result.ok && result.value.asNumber()).toBe(14);
  });
  it("asNumber() throws for a non-numeric value", () => {
    const result = ParameterValue.create("label", "string", "x");
    expect(result.ok).toBe(true);
    if (result.ok) expect(() => result.value.asNumber()).toThrow();
  });
});

describe("RiskProfile", () => {
  it("accepts valid bounds", () => {
    const result = RiskProfile.create({ tolerance: "MEDIUM", maxRiskPerTrade: 0.02, maxLeverage: 10, maxOpenPositions: 5 });
    expect(result.ok).toBe(true);
  });
  it("rejects maxRiskPerTrade of 0", () => {
    expect(RiskProfile.create({ tolerance: "LOW", maxRiskPerTrade: 0, maxLeverage: 1, maxOpenPositions: 1 }).ok).toBe(false);
  });
  it("rejects maxRiskPerTrade above 1", () => {
    expect(RiskProfile.create({ tolerance: "HIGH", maxRiskPerTrade: 1.5, maxLeverage: 1, maxOpenPositions: 1 }).ok).toBe(false);
  });
  it("rejects a non-positive maxLeverage", () => {
    expect(RiskProfile.create({ tolerance: "LOW", maxRiskPerTrade: 0.01, maxLeverage: 0, maxOpenPositions: 1 }).ok).toBe(false);
  });
  it("rejects a non-integer maxOpenPositions", () => {
    expect(RiskProfile.create({ tolerance: "LOW", maxRiskPerTrade: 0.01, maxLeverage: 1, maxOpenPositions: 1.5 }).ok).toBe(false);
  });
  it("conservative() returns a valid, low-risk profile", () => {
    expect(RiskProfile.conservative().tolerance).toBe("LOW");
  });
});
