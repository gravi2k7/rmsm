export const CopilotIntent = {
  MARKET_QUESTION: "MARKET_QUESTION",
  STRATEGY_QUESTION: "STRATEGY_QUESTION",
  RISK_QUESTION: "RISK_QUESTION",
  RESEARCH_REQUEST: "RESEARCH_REQUEST",
  GENERAL: "GENERAL",
} as const;
export type CopilotIntent = (typeof CopilotIntent)[keyof typeof CopilotIntent];
export const COPILOT_INTENTS = Object.values(CopilotIntent);

export const DecisionSupportVerdict = {
  FAVORABLE: "FAVORABLE",
  CAUTION: "CAUTION",
  UNFAVORABLE: "UNFAVORABLE",
} as const;
export type DecisionSupportVerdict = (typeof DecisionSupportVerdict)[keyof typeof DecisionSupportVerdict];
export const DECISION_SUPPORT_VERDICTS = Object.values(DecisionSupportVerdict);
