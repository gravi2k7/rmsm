import { describe, expect, it } from "vitest";
import { DrawdownAnalysisService } from "../services/drawdown-analysis.service";
import { RiskVerdict } from "../../domain/enums/risk-intelligence.enum";
import { buildPortfolioWithPeak } from "./fakes";

describe("DrawdownAnalysisService", () => {
  const service = new DrawdownAnalysisService();

  it("rates a small drawdown from REAL Portfolio.peakEquity as ACCEPTABLE", () => {
    const portfolio = buildPortfolioWithPeak("p1", 100_000, 110_000);
    const result = service.analyze(portfolio, 108_000, 5);
    expect(result.verdict).toBe(RiskVerdict.ACCEPTABLE);
  });

  it("rates a large drawdown from REAL Portfolio.peakEquity as CRITICAL", () => {
    const portfolio = buildPortfolioWithPeak("p1", 100_000, 110_000);
    const result = service.analyze(portfolio, 80_000, 5);
    expect(result.verdict).toBe(RiskVerdict.CRITICAL);
  });
});
