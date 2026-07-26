import { describe, expect, it } from "vitest";
import { RiskScoreBand, type StrategyRiskScore } from "@rmsm/ai-strategy-intelligence";
import { RiskAdjustedScoringService } from "../services/risk-adjusted-scoring.service";
import { buildOpportunity } from "./fakes";

describe("RiskAdjustedScoringService", () => {
  const service = new RiskAdjustedScoringService();

  it("discounts the raw score more heavily for a higher REAL AI-602 StrategyRiskScore", () => {
    const opportunity = buildOpportunity({ signalMagnitude: 0.9, confidenceScore: 90 });
    const lowRisk: StrategyRiskScore = { strategyId: "s1", riskScore: 10, band: RiskScoreBand.LOW };
    const highRisk: StrategyRiskScore = { strategyId: "s1", riskScore: 90, band: RiskScoreBand.EXTREME };

    const lowResult = service.score(opportunity, lowRisk);
    const highResult = service.score(opportunity, highRisk);

    expect(lowResult.rawScore).toBe(highResult.rawScore);
    expect(highResult.riskAdjustedScore).toBeLessThan(lowResult.riskAdjustedScore);
    expect(highResult.riskBand).toBe(RiskScoreBand.EXTREME);
  });
});
