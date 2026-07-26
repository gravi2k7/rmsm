import { describe, expect, it } from "vitest";
import { StrategyRecommendationAction, type StrategyRecommendation } from "@rmsm/ai-strategy-intelligence";
import { PortfolioRecommendationAction, type PortfolioRecommendation } from "@rmsm/ai-portfolio-intelligence";
import { RiskRecommendationAction, type RiskRecommendation } from "@rmsm/ai-risk-intelligence";
import { RecommendationAggregationService } from "../services/recommendation-aggregation.service";
import { NoRecommendationsSuppliedError } from "../../domain/errors/executive-dashboard-domain.errors";

describe("RecommendationAggregationService", () => {
  const service = new RecommendationAggregationService();

  it("aggregates REAL AI-602 + AI-604 + AI-605 recommendations, tagging each with its source", () => {
    const strategyRecommendation: StrategyRecommendation = { strategyId: "s1", action: StrategyRecommendationAction.PROMOTE, rationale: "Ready." };
    const portfolioRecommendation: PortfolioRecommendation = { portfolioId: "p1", action: PortfolioRecommendationAction.HOLD, rationale: "No changes needed." };
    const riskRecommendation: RiskRecommendation = { subjectId: "p1", action: RiskRecommendationAction.HOLD, rationale: "No risk mitigation warranted." };

    const result = service.aggregate(strategyRecommendation, portfolioRecommendation, riskRecommendation);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.source)).toEqual(["ai-strategy-intelligence", "ai-portfolio-intelligence", "ai-risk-intelligence"]);
  });

  it("throws NoRecommendationsSuppliedError when nothing is supplied", () => {
    expect(() => service.aggregate()).toThrow(NoRecommendationsSuppliedError);
  });
});
