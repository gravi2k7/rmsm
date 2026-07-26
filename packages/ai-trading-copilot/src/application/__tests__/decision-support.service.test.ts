import { describe, expect, it } from "vitest";
import { StrategyRecommendationAction, type StrategyRecommendation } from "@rmsm/ai-strategy-intelligence";
import { RiskRecommendationAction, type RiskRecommendation } from "@rmsm/ai-risk-intelligence";
import { DecisionSupportService } from "../services/decision-support.service";
import { DecisionSupportVerdict } from "../../domain/enums/trading-copilot.enum";

describe("DecisionSupportService", () => {
  const service = new DecisionSupportService();

  it("returns UNFAVORABLE when the risk recommendation says CLOSE_POSITION", () => {
    const strategyRecommendation: StrategyRecommendation = { strategyId: "s1", action: StrategyRecommendationAction.PROMOTE, rationale: "Ready to promote." };
    const riskRecommendation: RiskRecommendation = { subjectId: "s1", action: RiskRecommendationAction.CLOSE_POSITION, rationale: "Risk and drawdown both CRITICAL." };

    const result = service.support("EURUSD", "s1", strategyRecommendation, riskRecommendation);
    expect(result.verdict).toBe(DecisionSupportVerdict.UNFAVORABLE);
  });

  it("returns FAVORABLE when both recommendations are positive", () => {
    const strategyRecommendation: StrategyRecommendation = { strategyId: "s1", action: StrategyRecommendationAction.PROMOTE, rationale: "Ready to promote." };
    const riskRecommendation: RiskRecommendation = { subjectId: "s1", action: RiskRecommendationAction.HOLD, rationale: "No risk mitigation action warranted." };

    const result = service.support("EURUSD", "s1", strategyRecommendation, riskRecommendation);
    expect(result.verdict).toBe(DecisionSupportVerdict.FAVORABLE);
  });

  it("returns CAUTION when risk recommends reducing exposure", () => {
    const strategyRecommendation: StrategyRecommendation = { strategyId: "s1", action: StrategyRecommendationAction.PROMOTE, rationale: "Ready to promote." };
    const riskRecommendation: RiskRecommendation = { subjectId: "s1", action: RiskRecommendationAction.REDUCE_EXPOSURE, rationale: "Elevated risk." };

    const result = service.support("EURUSD", "s1", strategyRecommendation, riskRecommendation);
    expect(result.verdict).toBe(DecisionSupportVerdict.CAUTION);
  });
});
