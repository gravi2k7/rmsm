export const StrategyVerdict = {
  READY: "READY",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  NOT_READY: "NOT_READY",
} as const;
export type StrategyVerdict = (typeof StrategyVerdict)[keyof typeof StrategyVerdict];
export const STRATEGY_VERDICTS = Object.values(StrategyVerdict);

export const StrategyRecommendationAction = {
  PROMOTE: "PROMOTE",
  HOLD: "HOLD",
  DEMOTE: "DEMOTE",
  ARCHIVE: "ARCHIVE",
} as const;
export type StrategyRecommendationAction = (typeof StrategyRecommendationAction)[keyof typeof StrategyRecommendationAction];
export const STRATEGY_RECOMMENDATION_ACTIONS = Object.values(StrategyRecommendationAction);

export const SuitabilityLevel = {
  SUITABLE: "SUITABLE",
  MARGINAL: "MARGINAL",
  UNSUITABLE: "UNSUITABLE",
} as const;
export type SuitabilityLevel = (typeof SuitabilityLevel)[keyof typeof SuitabilityLevel];
export const SUITABILITY_LEVELS = Object.values(SuitabilityLevel);

export const RiskScoreBand = {
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  EXTREME: "EXTREME",
} as const;
export type RiskScoreBand = (typeof RiskScoreBand)[keyof typeof RiskScoreBand];
export const RISK_SCORE_BANDS = Object.values(RiskScoreBand);
