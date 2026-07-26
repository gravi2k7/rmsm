import type { Strategy } from "@rmsm/strategy";
import type { OptimizationSuggestion } from "../../domain/entities/optimization-suggestion.entity";

/** Structural suggestions read straight off rule/version counts — never
 * a backtest-driven "try these parameters" recommendation (that needs
 * real performance data, see `StrategyPerformanceAnalysisService`). */
export class StrategyOptimizationSuggestionService {
  suggest(strategy: Strategy): readonly OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const version = strategy.currentVersion;
    const strategyId = strategy.id.value;

    if (!version) {
      suggestions.push({ strategyId, code: "NO_VERSION", message: "Add a strategy version with entry/exit rules before optimizing further." });
      return suggestions;
    }

    const entryRules = version.entryRules.filter((r) => r.enabled);
    const exitRules = version.exitRules.filter((r) => r.enabled);

    if (exitRules.length === 0) {
      suggestions.push({ strategyId, code: "MISSING_EXIT_RULES", message: "No enabled exit rules — positions have no defined exit condition." });
    }
    if (entryRules.length === 1) {
      suggestions.push({ strategyId, code: "SINGLE_ENTRY_RULE", message: "Only one entry rule enabled — consider a confirming second condition to reduce false entries." });
    }
    if (strategy.riskProfile.maxOpenPositions === 1) {
      suggestions.push({ strategyId, code: "SINGLE_POSITION_LIMIT", message: "maxOpenPositions is 1 — diversification across concurrent positions is not possible." });
    }
    if (strategy.status === "PRODUCTION" && strategy.versions.length === 1) {
      suggestions.push({ strategyId, code: "UNVALIDATED_VERSION_IN_PRODUCTION", message: "Running in PRODUCTION on its very first version — no iteration history to validate against." });
    }
    if (suggestions.length === 0) {
      suggestions.push({ strategyId, code: "NO_STRUCTURAL_ISSUES", message: "No structural optimization opportunities found." });
    }

    return suggestions;
  }
}
