import type { PortfolioHealth } from "../../domain/entities/portfolio-health.entity";
import type { DiversificationAnalysis } from "../../domain/entities/diversification-analysis.entity";
import type { ExposureAnalysisResult } from "../../domain/entities/exposure-analysis-result.entity";
import type { PortfolioRecommendation } from "../../domain/entities/portfolio-recommendation.entity";
import { PortfolioRecommendationAction, PortfolioHealthVerdict, DiversificationLevel } from "../../domain/enums/portfolio-intelligence.enum";

/** Turns health + diversification + exposure analysis into ONE
 * recommendation — never mutates the portfolio itself; a human or
 * caller decides whether to act on it. */
export class PortfolioRecommendationService {
  recommend(portfolioId: string, health: PortfolioHealth, diversification: DiversificationAnalysis, exposureAnalysis: ExposureAnalysisResult): PortfolioRecommendation {
    if (!exposureAnalysis.withinLimit) {
      return {
        portfolioId,
        action: PortfolioRecommendationAction.REDUCE_RISK,
        rationale: `${exposureAnalysis.scope} exposure (${exposureAnalysis.percentage.toFixed(0)}%) exceeds its ${exposureAnalysis.limitPercentage}% limit.`,
      };
    }
    if (health.verdict === PortfolioHealthVerdict.AT_RISK) {
      return { portfolioId, action: PortfolioRecommendationAction.REDUCE_RISK, rationale: `Portfolio health is AT_RISK: ${health.reasons.join(" ")}` };
    }
    if (diversification.level === DiversificationLevel.CONCENTRATED) {
      return { portfolioId, action: PortfolioRecommendationAction.DIVERSIFY, rationale: diversification.reason };
    }
    if (diversification.level === DiversificationLevel.MODERATE) {
      return { portfolioId, action: PortfolioRecommendationAction.REBALANCE, rationale: "Moderate concentration — consider rebalancing toward a broader spread." };
    }
    return { portfolioId, action: PortfolioRecommendationAction.HOLD, rationale: "No structural changes warranted at this time." };
  }
}
