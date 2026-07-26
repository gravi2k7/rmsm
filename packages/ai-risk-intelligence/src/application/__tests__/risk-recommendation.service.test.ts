import { describe, expect, it } from "vitest";
import { RiskRecommendationService } from "../services/risk-recommendation.service";
import { RiskVerdict, RiskRecommendationAction } from "../../domain/enums/risk-intelligence.enum";

describe("RiskRecommendationService", () => {
  const service = new RiskRecommendationService();

  it("recommends CLOSE_POSITION when both risk and drawdown are CRITICAL", () => {
    const riskAnalysis = { subjectId: "s1", verdict: RiskVerdict.CRITICAL, overallScore: 90, reasons: [] };
    const drawdown = { portfolioId: "p1", currentDrawdownPercentage: 30, historicalMaxDrawdownPercentage: 35, verdict: RiskVerdict.CRITICAL, reason: "" };
    const exposure = { portfolioId: "p1", exposures: [], anyBreached: false };

    const recommendation = service.recommend("s1", riskAnalysis, drawdown, exposure);
    expect(recommendation.action).toBe(RiskRecommendationAction.CLOSE_POSITION);
  });

  it("recommends HOLD when everything is ACCEPTABLE", () => {
    const riskAnalysis = { subjectId: "s1", verdict: RiskVerdict.ACCEPTABLE, overallScore: 10, reasons: [] };
    const drawdown = { portfolioId: "p1", currentDrawdownPercentage: 2, historicalMaxDrawdownPercentage: 5, verdict: RiskVerdict.ACCEPTABLE, reason: "" };
    const exposure = { portfolioId: "p1", exposures: [], anyBreached: false };

    const recommendation = service.recommend("s1", riskAnalysis, drawdown, exposure);
    expect(recommendation.action).toBe(RiskRecommendationAction.HOLD);
  });
});
