import type { SignalQualityVerdict } from "../enums/signal-intelligence.enum";

/** Reads a REAL, unmodified `@rmsm/opportunity` `ScoringService.score()`
 * result and only classifies it — never recomputes confidence, signal
 * strength, or market-context multipliers itself. */
export interface SignalQualityAssessment {
  readonly opportunityId: string;
  readonly verdict: SignalQualityVerdict;
  readonly compositeScore: number;
  readonly reasons: readonly string[];
}
