import type { RiskAssessment } from "@rmsm/decision";
import type { RiskAnalysis } from "../../domain/entities/risk-analysis.entity";
import { RiskVerdict } from "../../domain/enums/risk-intelligence.enum";

/**
 * Classifies a REAL, unmodified `@rmsm/decision` `RiskAssessment` —
 * reads `overallScore` and `failedCheckNames()` directly, never
 * recomputes any of the five underlying checks (Maximum Daily Loss,
 * Maximum Position Size, Exposure Limits, Correlation Check, Margin
 * Check) or the overall `RiskScore` itself.
 */
export class RiskAnalysisService {
  analyze(subjectId: string, assessment: RiskAssessment): RiskAnalysis {
    const failedChecks = assessment.failedCheckNames();
    const overallScore = assessment.overallScore.value;

    const reasons = failedChecks.length > 0 ? failedChecks.map((name) => `${name} check failed.`) : [`All risk checks passed (score ${overallScore}/100).`];

    const verdict = !assessment.passed() ? RiskVerdict.CRITICAL : overallScore <= 40 ? RiskVerdict.ACCEPTABLE : overallScore <= 70 ? RiskVerdict.ELEVATED : RiskVerdict.CRITICAL;

    return { subjectId, verdict, overallScore, reasons };
  }
}
