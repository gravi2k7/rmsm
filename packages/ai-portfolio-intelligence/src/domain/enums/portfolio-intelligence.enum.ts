export const PortfolioHealthVerdict = {
  HEALTHY: "HEALTHY",
  CAUTION: "CAUTION",
  AT_RISK: "AT_RISK",
} as const;
export type PortfolioHealthVerdict = (typeof PortfolioHealthVerdict)[keyof typeof PortfolioHealthVerdict];
export const PORTFOLIO_HEALTH_VERDICTS = Object.values(PortfolioHealthVerdict);

export const DiversificationLevel = {
  WELL_DIVERSIFIED: "WELL_DIVERSIFIED",
  MODERATE: "MODERATE",
  CONCENTRATED: "CONCENTRATED",
} as const;
export type DiversificationLevel = (typeof DiversificationLevel)[keyof typeof DiversificationLevel];
export const DIVERSIFICATION_LEVELS = Object.values(DiversificationLevel);

export const PortfolioRecommendationAction = {
  HOLD: "HOLD",
  REDUCE_RISK: "REDUCE_RISK",
  DIVERSIFY: "DIVERSIFY",
  REBALANCE: "REBALANCE",
} as const;
export type PortfolioRecommendationAction = (typeof PortfolioRecommendationAction)[keyof typeof PortfolioRecommendationAction];
export const PORTFOLIO_RECOMMENDATION_ACTIONS = Object.values(PortfolioRecommendationAction);

export const RebalanceAction = {
  INCREASE: "INCREASE",
  DECREASE: "DECREASE",
  HOLD: "HOLD",
} as const;
export type RebalanceAction = (typeof RebalanceAction)[keyof typeof RebalanceAction];
export const REBALANCE_ACTIONS = Object.values(RebalanceAction);
