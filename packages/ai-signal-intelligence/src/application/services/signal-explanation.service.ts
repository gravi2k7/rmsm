import type { Opportunity } from "@rmsm/opportunity";
import type { SignalQualityAssessment } from "../../domain/entities/signal-quality-assessment.entity";
import type { SignalExplanation } from "../../domain/entities/signal-explanation.entity";

/** Plain-language narrative composing an opportunity's own fields plus
 * a `SignalQualityAssessment` — never recomputes either. */
export class SignalExplanationService {
  explain(opportunity: Opportunity, assessment: SignalQualityAssessment): SignalExplanation {
    const parts = [
      `${opportunity.signal.direction} signal on ${opportunity.symbolCode.value} from source "${opportunity.signal.sourceId}", strength ${opportunity.signal.strength.level.toLowerCase()}.`,
      `Composite score ${assessment.compositeScore.toFixed(0)}/100 (${assessment.verdict}).`,
      `Market context: ${opportunity.marketContext.trend} trend, ${opportunity.marketContext.volatility} volatility, ${opportunity.marketContext.liquidity} liquidity.`,
    ];
    if (assessment.verdict !== "HIGH") {
      parts.push(assessment.reasons.join(" "));
    }
    return { opportunityId: opportunity.id, narrative: parts.join(" ") };
  }
}
