import type { BacktestInterpretation } from "../../domain/entities/backtest-interpretation.entity";
import type { PatternDetectionResult } from "../../domain/entities/trade-pattern.entity";
import type { PerformanceSummary } from "../../domain/entities/performance-summary.entity";
import type { NaturalLanguageExplanation } from "../../domain/entities/natural-language-explanation.entity";

/** Composes an interpretation + performance summary + detected patterns
 * (all produced elsewhere in this package) into one plain-language
 * explanation — never recomputes any of them. */
export class BacktestExplanationService {
  explain(runId: string, interpretation: BacktestInterpretation, performanceSummary: PerformanceSummary, patterns: PatternDetectionResult): NaturalLanguageExplanation {
    const parts = [
      `This backtest run is ${interpretation.verdict}.`,
      performanceSummary.narrative,
      patterns.patterns.length > 0 ? `Detected patterns: ${patterns.patterns.map((p) => p.description).join(" ")}` : "No notable trade patterns detected.",
    ];
    return { runId, narrative: parts.join(" ") };
  }
}
