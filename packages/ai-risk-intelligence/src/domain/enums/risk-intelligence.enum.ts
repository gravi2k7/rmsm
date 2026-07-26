export const RiskVerdict = {
  ACCEPTABLE: "ACCEPTABLE",
  ELEVATED: "ELEVATED",
  CRITICAL: "CRITICAL",
} as const;
export type RiskVerdict = (typeof RiskVerdict)[keyof typeof RiskVerdict];
export const RISK_VERDICTS = Object.values(RiskVerdict);

export const CorrelationLevel = {
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
} as const;
export type CorrelationLevel = (typeof CorrelationLevel)[keyof typeof CorrelationLevel];
export const CORRELATION_LEVELS = Object.values(CorrelationLevel);

export const RiskAlertSeverity = {
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
} as const;
export type RiskAlertSeverity = (typeof RiskAlertSeverity)[keyof typeof RiskAlertSeverity];
export const RISK_ALERT_SEVERITIES = Object.values(RiskAlertSeverity);

export const RiskRecommendationAction = {
  HOLD: "HOLD",
  REDUCE_EXPOSURE: "REDUCE_EXPOSURE",
  HEDGE: "HEDGE",
  CLOSE_POSITION: "CLOSE_POSITION",
} as const;
export type RiskRecommendationAction = (typeof RiskRecommendationAction)[keyof typeof RiskRecommendationAction];
export const RISK_RECOMMENDATION_ACTIONS = Object.values(RiskRecommendationAction);
