import { describe, expect, it } from "vitest";
import { StrategyOptimizationSuggestionService } from "../services/strategy-optimization-suggestion.service";
import { buildStrategy } from "./fakes";

describe("StrategyOptimizationSuggestionService", () => {
  const service = new StrategyOptimizationSuggestionService();

  it("flags missing exit rules", () => {
    const strategy = buildStrategy({ exitRuleCount: 0 });
    const suggestions = service.suggest(strategy);
    expect(suggestions.some((s) => s.code === "MISSING_EXIT_RULES")).toBe(true);
  });

  it("flags a single-position limit", () => {
    const strategy = buildStrategy({ maxOpenPositions: 1 });
    const suggestions = service.suggest(strategy);
    expect(suggestions.some((s) => s.code === "SINGLE_POSITION_LIMIT")).toBe(true);
  });

  it("reports no structural issues for a well-formed, diversified strategy", () => {
    const strategy = buildStrategy({ entryRuleCount: 2, exitRuleCount: 2, maxOpenPositions: 5, status: "PAPER_TRADING" });
    const suggestions = service.suggest(strategy);
    expect(suggestions).toEqual([{ strategyId: strategy.id.value, code: "NO_STRUCTURAL_ISSUES", message: "No structural optimization opportunities found." }]);
  });
});
