import { describe, expect, it } from "vitest";
import { StrategyEvaluationService } from "../services/strategy-evaluation.service";
import { StrategyRiskScoringService } from "../services/strategy-risk-scoring.service";
import { StrategyRecommendationService } from "../services/strategy-recommendation.service";
import { StrategyRecommendationAction } from "../../domain/enums/strategy-intelligence.enum";
import { buildStrategy } from "./fakes";

describe("StrategyRecommendationService", () => {
  const evaluationService = new StrategyEvaluationService();
  const riskScoringService = new StrategyRiskScoringService();
  const service = new StrategyRecommendationService();

  it("recommends PROMOTE for a ready TESTING strategy", () => {
    const strategy = buildStrategy({ status: "TESTING" });
    const recommendation = service.recommend(strategy, evaluationService.evaluate(strategy), riskScoringService.score(strategy));
    expect(recommendation.action).toBe(StrategyRecommendationAction.PROMOTE);
  });

  it("recommends HOLD for a version-less TESTING strategy", () => {
    const strategy = buildStrategy({ status: "TESTING", entryRuleCount: 0, exitRuleCount: 0 });
    const recommendation = service.recommend(strategy, evaluationService.evaluate(strategy), riskScoringService.score(strategy));
    expect(recommendation.action).toBe(StrategyRecommendationAction.HOLD);
  });

  it("recommends ARCHIVE for a NOT_READY strategy already in PRODUCTION", () => {
    const strategy = buildStrategy({ status: "PRODUCTION", entryRuleCount: 0, exitRuleCount: 0 });
    const recommendation = service.recommend(strategy, evaluationService.evaluate(strategy), riskScoringService.score(strategy));
    expect(recommendation.action).toBe(StrategyRecommendationAction.ARCHIVE);
  });
});
