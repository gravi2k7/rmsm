import type { DecisionSupportVerdict } from "../enums/trading-copilot.enum";

/** Composes a REAL `@rmsm/ai-strategy-intelligence` (AI-602)
 * `StrategyRecommendation` and a REAL `@rmsm/ai-risk-intelligence`
 * (AI-605) `RiskRecommendation` — never a third, independent decision
 * calculation. */
export interface DecisionSupportResult {
  readonly symbolCode: string;
  readonly strategyId: string;
  readonly verdict: DecisionSupportVerdict;
  readonly rationale: string;
}
