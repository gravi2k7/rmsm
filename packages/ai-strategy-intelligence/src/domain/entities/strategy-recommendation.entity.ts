import type { StrategyRecommendationAction } from "../enums/strategy-intelligence.enum";

export interface StrategyRecommendation {
  readonly strategyId: string;
  readonly action: StrategyRecommendationAction;
  readonly rationale: string;
}
