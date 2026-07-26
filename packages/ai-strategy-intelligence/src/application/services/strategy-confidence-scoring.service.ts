import type { Strategy } from "@rmsm/strategy";
import type { StrategyEvaluation } from "../../domain/entities/strategy-evaluation.entity";
import type { StrategyConfidenceScore } from "../../domain/entities/strategy-confidence-score.entity";

const STATUS_WEIGHT: Readonly<Record<string, number>> = {
  DRAFT: 0.1,
  TESTING: 0.35,
  PAPER_TRADING: 0.65,
  PRODUCTION: 0.9,
  ARCHIVED: 0.2,
};

/** Confidence that a strategy's current signals are trustworthy — composes
 * `StrategyEvaluation.completenessScore` (never recomputed here) with
 * lifecycle maturity and version count, both read straight off `Strategy`. */
export class StrategyConfidenceScoringService {
  score(strategy: Strategy, evaluation: StrategyEvaluation): StrategyConfidenceScore {
    const maturity = STATUS_WEIGHT[strategy.status] ?? 0.3;
    const versionDepth = Math.min(1, strategy.versions.length / 5);

    const factors: Record<string, number> = {
      completeness: evaluation.completenessScore,
      lifecycleMaturity: maturity,
      versionDepth,
    };

    const confidence = factors.completeness! * 0.5 + factors.lifecycleMaturity! * 0.35 + factors.versionDepth! * 0.15;

    return { strategyId: strategy.id.value, confidence: Math.max(0, Math.min(1, confidence)), factors };
  }
}
