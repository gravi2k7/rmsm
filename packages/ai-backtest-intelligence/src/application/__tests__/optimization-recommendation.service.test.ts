import { describe, expect, it } from "vitest";
import { OptimizationRecommendationService } from "../services/optimization-recommendation.service";
import { BacktestVerdict, TradePatternType } from "../../domain/enums/backtest-intelligence.enum";

describe("OptimizationRecommendationService", () => {
  const service = new OptimizationRecommendationService();

  it("flags a losing streak detected elsewhere in the package", () => {
    const interpretation = { runId: "run-1", verdict: BacktestVerdict.MARGINAL, reasons: [] };
    const patterns = { runId: "run-1", patterns: [{ type: TradePatternType.LOSING_STREAK, description: "Longest losing streak was 4 consecutive trades.", occurrences: 4 }] };

    const recommendations = service.recommend(interpretation, patterns);
    expect(recommendations.some((r) => r.code === "LOSING_STREAK_DETECTED")).toBe(true);
  });

  it("reports no structural issues for a STRONG run with no patterns", () => {
    const interpretation = { runId: "run-1", verdict: BacktestVerdict.STRONG, reasons: [] };
    const patterns = { runId: "run-1", patterns: [] };

    const recommendations = service.recommend(interpretation, patterns);
    expect(recommendations).toEqual([{ runId: "run-1", code: "NO_STRUCTURAL_ISSUES", message: "No structural optimization opportunities found." }]);
  });
});
