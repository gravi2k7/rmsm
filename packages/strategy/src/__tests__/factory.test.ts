import { describe, expect, it } from "vitest";
import { StrategyFactory, type RawStrategyInput } from "../factories/strategy.factory";
import { StrategyTemplate } from "../entities/strategy-template";
import { RiskProfile } from "../value-objects/risk-profile";
import { Timeframe } from "@rmsm/market";

function validInput(): RawStrategyInput {
  return {
    name: "MA Crossover",
    description: "x",
    riskTolerance: "MEDIUM",
    maxRiskPerTrade: 0.02,
    maxLeverage: 10,
    maxOpenPositions: 5,
    timeframe: Timeframe.H1,
    supportedSymbols: ["eurusd", "gbpusd"],
  };
}

describe("StrategyFactory.create", () => {
  it("builds a valid Strategy from valid input", () => {
    const result = StrategyFactory.create(validInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("MA Crossover");
      expect(result.value.supportedSymbols).toHaveLength(2);
    }
  });

  it("generates a random id when none is supplied", () => {
    const a = StrategyFactory.create(validInput());
    const b = StrategyFactory.create(validInput());
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.value.id.value).not.toBe(b.value.id.value);
    }
  });

  it("fails on an invalid risk profile", () => {
    const result = StrategyFactory.create({ ...validInput(), maxRiskPerTrade: 2 });
    expect(result.ok).toBe(false);
  });

  it("fails on an invalid symbol code", () => {
    const result = StrategyFactory.create({ ...validInput(), supportedSymbols: ["!!!"] });
    expect(result.ok).toBe(false);
  });
});

describe("StrategyFactory.fromTemplate", () => {
  it("seeds the new strategy's risk profile from the template's own default", () => {
    const template = StrategyTemplate.create("t1", {
      name: "Template",
      description: "x",
      defaultRules: [],
      defaultParameters: [],
      defaultRiskProfile: RiskProfile.conservative(),
    });

    const result = StrategyFactory.fromTemplate(template, {
      name: "New Strategy",
      description: "x",
      timeframe: Timeframe.H1,
      supportedSymbols: ["eurusd"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.riskProfile.tolerance).toBe("LOW");
    }
  });
});
