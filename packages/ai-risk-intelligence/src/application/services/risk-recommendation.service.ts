import type { RiskAnalysis } from "../../domain/entities/risk-analysis.entity";
import type { DrawdownAnalysis } from "../../domain/entities/drawdown-analysis.entity";
import type { ExposureMonitoringResult } from "../../domain/entities/exposure-monitoring-result.entity";
import type { RiskRecommendation } from "../../domain/entities/risk-recommendation.entity";
import { RiskRecommendationAction, RiskVerdict } from "../../domain/enums/risk-intelligence.enum";

/** Turns already-computed risk/drawdown/exposure analyses into ONE
 * recommendation — never mutates a portfolio or position itself; a
 * human or caller decides whether to act on it. */
export class RiskRecommendationService {
  recommend(subjectId: string, riskAnalysis: RiskAnalysis, drawdown: DrawdownAnalysis, exposure: ExposureMonitoringResult): RiskRecommendation {
    if (riskAnalysis.verdict === RiskVerdict.CRITICAL && drawdown.verdict === RiskVerdict.CRITICAL) {
      return { subjectId, action: RiskRecommendationAction.CLOSE_POSITION, rationale: "Both risk assessment and drawdown are CRITICAL — consider closing the riskiest positions." };
    }
    if (exposure.anyBreached) {
      return { subjectId, action: RiskRecommendationAction.REDUCE_EXPOSURE, rationale: "One or more exposure limits are currently breached." };
    }
    if (riskAnalysis.verdict === RiskVerdict.CRITICAL || drawdown.verdict === RiskVerdict.CRITICAL) {
      return { subjectId, action: RiskRecommendationAction.HEDGE, rationale: "Risk or drawdown is CRITICAL — consider hedging to limit further downside." };
    }
    if (riskAnalysis.verdict === RiskVerdict.ELEVATED || drawdown.verdict === RiskVerdict.ELEVATED) {
      return { subjectId, action: RiskRecommendationAction.REDUCE_EXPOSURE, rationale: "Risk or drawdown is elevated — consider trimming exposure." };
    }
    return { subjectId, action: RiskRecommendationAction.HOLD, rationale: "No risk mitigation action warranted at this time." };
  }
}
