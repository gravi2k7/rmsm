import type { Opportunity } from "@rmsm/opportunity";
import { ScoringService } from "@rmsm/opportunity";
import type { StrategyRiskScore } from "@rmsm/ai-strategy-intelligence";
import type { RiskAdjustedScore } from "../../domain/entities/risk-adjusted-score.entity";

/**
 * Cross-package AI-6xx reuse: discounts a REAL `@rmsm/opportunity`
 * composite score by a REAL `@rmsm/ai-strategy-intelligence` (AI-602)
 * `StrategyRiskScore` — a higher declared strategy risk score pulls the
 * signal's own score down, on the theory that a riskier strategy's
 * signals deserve more scrutiny before acting. Never recomputes either
 * input.
 */
export class RiskAdjustedScoringService {
  constructor(private readonly scoringService: ScoringService = new ScoringService()) {}

  score(opportunity: Opportunity, strategyRiskScore: StrategyRiskScore): RiskAdjustedScore {
    const rawScore = this.scoringService.score(opportunity.confidence, opportunity.signal.strength, opportunity.marketContext).value;
    const discount = 1 - (strategyRiskScore.riskScore / 100) * 0.5;
    const riskAdjustedScore = Math.max(0, Math.min(100, rawScore * discount));

    return { opportunityId: opportunity.id, rawScore, riskAdjustedScore, riskBand: strategyRiskScore.band };
  }
}
