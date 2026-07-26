import type { Strategy } from "@rmsm/strategy";
import type { StrategyEvaluation } from "../../domain/entities/strategy-evaluation.entity";
import type { StrategyRiskScore } from "../../domain/entities/strategy-risk-score.entity";
import type { StrategyConfidenceScore } from "../../domain/entities/strategy-confidence-score.entity";
import type { StrategyExplanation } from "../../domain/entities/strategy-explanation.entity";
import type { Clock } from "@rmsm/core";
import { SystemClock } from "@rmsm/core";

/** Plain-language explanation composing evaluation/risk/confidence —
 * never recomputes any of the three, only narrates them. */
export class StrategyExplanationService {
  constructor(private readonly clock: Clock = new SystemClock()) {}

  explain(strategy: Strategy, evaluation: StrategyEvaluation, riskScore: StrategyRiskScore, confidence: StrategyConfidenceScore): StrategyExplanation {
    const parts = [
      `"${strategy.name}" is currently ${strategy.status}${strategy.enabled ? " and enabled" : " and disabled"}.`,
      `Readiness verdict: ${evaluation.verdict} (${(evaluation.completenessScore * 100).toFixed(0)}% of readiness checks passed).`,
      `Risk score is ${riskScore.riskScore}/100 (${riskScore.band} band, ${strategy.riskProfile.tolerance} declared tolerance).`,
      `Confidence in current signals is ${(confidence.confidence * 100).toFixed(0)}%.`,
    ];
    if (evaluation.reasons.length > 0 && evaluation.verdict !== "READY") {
      parts.push(`Open items: ${evaluation.reasons.join(" ")}`);
    }
    return { strategyId: strategy.id.value, narrative: parts.join(" "), generatedAt: this.clock.now() };
  }
}
