import type { BacktestInterpretation } from "../../domain/entities/backtest-interpretation.entity";
import type { PatternDetectionResult } from "../../domain/entities/trade-pattern.entity";
import type { OptimizationRecommendation } from "../../domain/entities/optimization-recommendation.entity";
import { TradePatternType } from "../../domain/enums/backtest-intelligence.enum";
import { BacktestVerdict } from "../../domain/enums/backtest-intelligence.enum";

/** Structural recommendations read straight off `BacktestInterpretation`
 * and `PatternDetectionResult` (both produced elsewhere in this
 * package) — never a second performance calculation. */
export class OptimizationRecommendationService {
  recommend(interpretation: BacktestInterpretation, patterns: PatternDetectionResult): readonly OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const runId = interpretation.runId;

    if (interpretation.verdict === BacktestVerdict.WEAK) {
      recommendations.push({ runId, code: "WEAK_PERFORMANCE", message: `Overall performance is WEAK: ${interpretation.reasons.join(" ")}` });
    }

    const losingStreak = patterns.patterns.find((p) => p.type === TradePatternType.LOSING_STREAK);
    if (losingStreak) {
      recommendations.push({ runId, code: "LOSING_STREAK_DETECTED", message: `${losingStreak.description} Consider a cooldown or reduced size after consecutive losses.` });
    }

    const overtrading = patterns.patterns.find((p) => p.type === TradePatternType.OVERTRADING_DAY);
    if (overtrading) {
      recommendations.push({ runId, code: "OVERTRADING_DETECTED", message: `${overtrading.description} Consider a daily trade cap.` });
    }

    const largeLoss = patterns.patterns.find((p) => p.type === TradePatternType.LARGE_LOSS_OUTLIER);
    if (largeLoss) {
      recommendations.push({ runId, code: "LARGE_LOSS_OUTLIERS", message: `${largeLoss.description} Consider tighter stop-loss discipline.` });
    }

    if (recommendations.length === 0) {
      recommendations.push({ runId, code: "NO_STRUCTURAL_ISSUES", message: "No structural optimization opportunities found." });
    }

    return recommendations;
  }
}
