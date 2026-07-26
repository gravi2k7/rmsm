import type { RiskVerdict } from "../enums/risk-intelligence.enum";

/** Reads a REAL, unmodified `@rmsm/decision` `RiskAssessment` — never
 * recomputes any of its five checks or its overall `RiskScore`. */
export interface RiskAnalysis {
  readonly subjectId: string;
  readonly verdict: RiskVerdict;
  readonly overallScore: number;
  readonly reasons: readonly string[];
}
