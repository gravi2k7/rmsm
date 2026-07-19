import { describe, expect, it } from "vitest";
import { OpportunityFactory, type RawOpportunityInput } from "../factories/opportunity.factory";

function validInput(): RawOpportunityInput {
  return {
    id: "opp-1",
    symbolCode: "eurusd",
    strategyId: "strategy-1",
    signalId: "sig-1",
    direction: "BUY",
    signalMagnitude: 0.8,
    confidenceScore: 75,
    trend: "UP",
    volatility: "LOW",
    liquidity: "HIGH",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    expiresAt: new Date("2026-01-01T01:00:00Z"),
  };
}

describe("OpportunityFactory.create", () => {
  it("builds a valid Opportunity from valid input", () => {
    const result = OpportunityFactory.create(validInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("PENDING");
      expect(result.value.signal.direction).toBe("BUY");
      expect(result.value.confidence.score).toBe(75);
    }
  });

  it("fails on an invalid symbol code", () => {
    const result = OpportunityFactory.create({ ...validInput(), symbolCode: "!!!" });
    expect(result.ok).toBe(false);
  });

  it("fails on an out-of-range signal magnitude", () => {
    const result = OpportunityFactory.create({ ...validInput(), signalMagnitude: 2 });
    expect(result.ok).toBe(false);
  });

  it("fails on an out-of-range confidence score", () => {
    const result = OpportunityFactory.create({ ...validInput(), confidenceScore: 150 });
    expect(result.ok).toBe(false);
  });
});
