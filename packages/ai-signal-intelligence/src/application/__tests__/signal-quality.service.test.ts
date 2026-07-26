import { describe, expect, it } from "vitest";
import { SignalQualityService } from "../services/signal-quality.service";
import { SignalQualityVerdict } from "../../domain/enums/signal-intelligence.enum";
import { buildOpportunity } from "./fakes";

describe("SignalQualityService", () => {
  const service = new SignalQualityService();

  it("rates a strong, confident, favorable-context signal as HIGH", () => {
    const opportunity = buildOpportunity({ signalMagnitude: 0.9, confidenceScore: 90, volatility: "LOW", liquidity: "HIGH" });
    const result = service.assess(opportunity);
    expect(result.verdict).toBe(SignalQualityVerdict.HIGH);
  });

  it("rates a weak, low-confidence, unfavorable-context signal as LOW", () => {
    const opportunity = buildOpportunity({ signalMagnitude: 0.1, confidenceScore: 10, volatility: "HIGH", liquidity: "LOW" });
    const result = service.assess(opportunity);
    expect(result.verdict).toBe(SignalQualityVerdict.LOW);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
