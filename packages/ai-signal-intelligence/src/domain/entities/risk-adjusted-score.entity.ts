import type { RiskScoreBand } from "@rmsm/ai-strategy-intelligence";

/** Discounts a REAL `@rmsm/opportunity` `CompositeScore.value` by a REAL
 * `@rmsm/ai-strategy-intelligence` (AI-602) `StrategyRiskScore` — never
 * recomputes either input, only combines them. */
export interface RiskAdjustedScore {
  readonly opportunityId: string;
  readonly rawScore: number;
  readonly riskAdjustedScore: number;
  readonly riskBand: RiskScoreBand;
}
