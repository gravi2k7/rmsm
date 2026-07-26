import type { StrategyEvaluation } from "./strategy-evaluation.entity";
import type { StrategyRiskScore } from "./strategy-risk-score.entity";
import type { StrategyConfidenceScore } from "./strategy-confidence-score.entity";
import type { StrategyRecommendation } from "./strategy-recommendation.entity";

/** The flagship composite: every other analysis in this package rolled
 * into one narrative report, mirroring AI-601's own `MarketSummary`
 * composition pattern. Never recomputes any of its inputs. */
export interface StrategyIntelligenceReport {
  readonly strategyId: string;
  readonly evaluation: StrategyEvaluation;
  readonly riskScore: StrategyRiskScore;
  readonly confidence: StrategyConfidenceScore;
  readonly recommendation: StrategyRecommendation;
  readonly narrative: string;
  readonly generatedAt: Date;
}
