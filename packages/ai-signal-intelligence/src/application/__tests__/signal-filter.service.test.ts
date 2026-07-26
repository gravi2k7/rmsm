import { describe, expect, it } from "vitest";
import { SignalFilterService } from "../services/signal-filter.service";
import { buildOpportunity } from "./fakes";

describe("SignalFilterService", () => {
  const service = new SignalFilterService();

  it("excludes low-score signals below minCompositeScore", () => {
    const strong = buildOpportunity({ id: "strong", signalMagnitude: 0.9, confidenceScore: 90 });
    const weak = buildOpportunity({ id: "weak", signalMagnitude: 0.1, confidenceScore: 10 });

    const result = service.filter([strong, weak], { minCompositeScore: 50 });
    expect(result.includedOpportunityIds).toEqual(["strong"]);
    expect(result.excluded.some((e) => e.opportunityId === "weak")).toBe(true);
  });

  it("excludes opportunities with unfavorable market context when requireFavorableContext is set", () => {
    const unfavorable = buildOpportunity({ id: "unfavorable", volatility: "HIGH", liquidity: "LOW" });
    const result = service.filter([unfavorable], { requireFavorableContext: true });
    expect(result.includedOpportunityIds).toEqual([]);
  });

  it("excludes expired opportunities when excludeExpired is set", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const expiresAt = new Date("2026-01-01T00:10:00.000Z");
    const opportunity = buildOpportunity({ id: "expired", createdAt, expiresAt });

    const result = service.filter([opportunity], { excludeExpired: true, asOf: new Date("2026-01-01T00:20:00.000Z") });
    expect(result.includedOpportunityIds).toEqual([]);
  });
});
