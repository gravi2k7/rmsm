import type { StrategyRecommendation } from "@rmsm/ai-strategy-intelligence";
import type { PortfolioRecommendation } from "@rmsm/ai-portfolio-intelligence";
import type { RiskRecommendation } from "@rmsm/ai-risk-intelligence";
import type { AggregatedRecommendation } from "../../domain/entities/aggregated-recommendation.entity";
import { NoRecommendationsSuppliedError } from "../../domain/errors/executive-dashboard-domain.errors";

/** Collects REAL, unmodified `StrategyRecommendation` (AI-602),
 * `PortfolioRecommendation` (AI-604), and `RiskRecommendation` (AI-605)
 * objects into one tagged list — never a fourth, independent
 * recommendation calculation. */
export class RecommendationAggregationService {
  aggregate(
    strategyRecommendation?: StrategyRecommendation,
    portfolioRecommendation?: PortfolioRecommendation,
    riskRecommendation?: RiskRecommendation,
  ): readonly AggregatedRecommendation[] {
    const recommendations: AggregatedRecommendation[] = [];
    if (strategyRecommendation) recommendations.push({ source: "ai-strategy-intelligence", action: strategyRecommendation.action, rationale: strategyRecommendation.rationale });
    if (portfolioRecommendation) recommendations.push({ source: "ai-portfolio-intelligence", action: portfolioRecommendation.action, rationale: portfolioRecommendation.rationale });
    if (riskRecommendation) recommendations.push({ source: "ai-risk-intelligence", action: riskRecommendation.action, rationale: riskRecommendation.rationale });

    if (recommendations.length === 0) throw new NoRecommendationsSuppliedError();
    return recommendations;
  }
}
