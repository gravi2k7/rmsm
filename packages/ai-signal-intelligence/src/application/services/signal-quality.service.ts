import type { Opportunity } from "@rmsm/opportunity";
import { ScoringService } from "@rmsm/opportunity";
import type { SignalQualityAssessment } from "../../domain/entities/signal-quality-assessment.entity";
import { SignalQualityVerdict } from "../../domain/enums/signal-intelligence.enum";

/**
 * Classifies signal quality from a REAL, unmodified `@rmsm/opportunity`
 * `ScoringService.score()` result — that service already blends
 * confidence, signal strength, and market context; this only adds the
 * HIGH/MEDIUM/LOW verdict and plain-language reasons on top, never a
 * second scoring formula.
 */
export class SignalQualityService {
  constructor(private readonly scoringService: ScoringService = new ScoringService()) {}

  assess(opportunity: Opportunity): SignalQualityAssessment {
    const composite = this.scoringService.score(opportunity.confidence, opportunity.signal.strength, opportunity.marketContext);
    const reasons: string[] = [];

    if (opportunity.confidence.isLow()) reasons.push("Source confidence is low.");
    if (opportunity.signal.strength.level === "WEAK") reasons.push("Underlying signal strength is weak.");
    if (!opportunity.marketContext.isFavorable()) reasons.push("Market conditions are unfavorable (high volatility, low liquidity).");
    if (reasons.length === 0) reasons.push("No quality concerns identified.");

    const verdict = composite.value >= 70 ? SignalQualityVerdict.HIGH : composite.value >= 40 ? SignalQualityVerdict.MEDIUM : SignalQualityVerdict.LOW;

    return { opportunityId: opportunity.id, verdict, compositeScore: composite.value, reasons };
  }
}
