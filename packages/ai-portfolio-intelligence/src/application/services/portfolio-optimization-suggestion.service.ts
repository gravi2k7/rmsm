import type { AllocationBreakdown } from "../../domain/entities/allocation-breakdown.entity";
import type { DiversificationAnalysis } from "../../domain/entities/diversification-analysis.entity";
import type { OptimizationSuggestion } from "../../domain/entities/optimization-suggestion.entity";
import { DiversificationLevel } from "../../domain/enums/portfolio-intelligence.enum";

/** Structural suggestions read straight off allocation weights and
 * diversification level — never a backtest-driven recommendation. */
export class PortfolioOptimizationSuggestionService {
  suggest(allocation: AllocationBreakdown, diversification: DiversificationAnalysis): readonly OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const portfolioId = allocation.portfolioId;

    if (allocation.allocations.length === 0) {
      suggestions.push({ portfolioId, code: "NO_OPEN_POSITIONS", message: "No open positions — nothing to optimize yet." });
      return suggestions;
    }

    const largest = [...allocation.allocations].sort((a, b) => b.weightPercentage - a.weightPercentage)[0];
    if (largest && largest.weightPercentage > 40) {
      suggestions.push({ portfolioId, code: "SINGLE_SYMBOL_OVERWEIGHT", message: `${largest.symbolCode} is ${largest.weightPercentage.toFixed(0)}% of the portfolio — consider trimming.` });
    }
    if (diversification.level === DiversificationLevel.CONCENTRATED) {
      suggestions.push({ portfolioId, code: "LOW_DIVERSIFICATION", message: "Herfindahl-Hirschman Index indicates high concentration — consider adding uncorrelated symbols." });
    }
    if (allocation.allocations.length === 1) {
      suggestions.push({ portfolioId, code: "SINGLE_POSITION_PORTFOLIO", message: "Only one open position — no diversification is currently possible." });
    }
    if (suggestions.length === 0) {
      suggestions.push({ portfolioId, code: "NO_STRUCTURAL_ISSUES", message: "No structural optimization opportunities found." });
    }

    return suggestions;
  }
}
