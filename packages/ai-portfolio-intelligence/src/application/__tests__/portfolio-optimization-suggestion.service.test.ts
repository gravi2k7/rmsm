import { describe, expect, it } from "vitest";
import { PortfolioOptimizationSuggestionService } from "../services/portfolio-optimization-suggestion.service";
import { DiversificationLevel } from "../../domain/enums/portfolio-intelligence.enum";

describe("PortfolioOptimizationSuggestionService", () => {
  const service = new PortfolioOptimizationSuggestionService();

  it("flags a single-symbol overweight allocation", () => {
    const allocation = { portfolioId: "p1", allocations: [{ symbolCode: "EURUSD", weightPercentage: 60 }, { symbolCode: "GBPUSD", weightPercentage: 10 }] };
    const diversification = { portfolioId: "p1", level: DiversificationLevel.CONCENTRATED, herfindahlIndex: 0.5, reason: "concentrated" };

    const suggestions = service.suggest(allocation, diversification);
    expect(suggestions.some((s) => s.code === "SINGLE_SYMBOL_OVERWEIGHT")).toBe(true);
    expect(suggestions.some((s) => s.code === "LOW_DIVERSIFICATION")).toBe(true);
  });

  it("reports no open positions when the allocation is empty", () => {
    const allocation = { portfolioId: "p1", allocations: [] };
    const diversification = { portfolioId: "p1", level: DiversificationLevel.WELL_DIVERSIFIED, herfindahlIndex: 0, reason: "" };

    const suggestions = service.suggest(allocation, diversification);
    expect(suggestions).toEqual([{ portfolioId: "p1", code: "NO_OPEN_POSITIONS", message: "No open positions — nothing to optimize yet." }]);
  });
});
