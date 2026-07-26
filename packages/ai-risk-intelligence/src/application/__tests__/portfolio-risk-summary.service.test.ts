import { describe, expect, it } from "vitest";
import { PortfolioRiskSummaryService } from "../services/portfolio-risk-summary.service";
import { RiskVerdict } from "../../domain/enums/risk-intelligence.enum";

describe("PortfolioRiskSummaryService", () => {
  const service = new PortfolioRiskSummaryService();

  it("produces ACCEPTABLE for low drawdown, low exposure, low correlation", () => {
    const drawdown = { portfolioId: "p1", currentDrawdownPercentage: 2, historicalMaxDrawdownPercentage: 5, verdict: RiskVerdict.ACCEPTABLE, reason: "" };
    const exposure = { portfolioId: "p1", exposures: [{ scope: "PORTFOLIO", percentage: 10, limitPercentage: 50, withinLimit: true }], anyBreached: false };
    const correlations = [{ symbolCode: "EURUSD", correlations: [], maxAbsoluteCorrelation: 0.1 }];

    const summary = service.summarize("p1", drawdown, exposure, correlations);
    expect(summary.verdict).toBe(RiskVerdict.ACCEPTABLE);
  });

  it("produces CRITICAL for high drawdown, high exposure, high correlation", () => {
    const drawdown = { portfolioId: "p1", currentDrawdownPercentage: 30, historicalMaxDrawdownPercentage: 35, verdict: RiskVerdict.CRITICAL, reason: "" };
    const exposure = { portfolioId: "p1", exposures: [{ scope: "PORTFOLIO", percentage: 95, limitPercentage: 50, withinLimit: false }], anyBreached: true };
    const correlations = [{ symbolCode: "EURUSD", correlations: [], maxAbsoluteCorrelation: 0.9 }];

    const summary = service.summarize("p1", drawdown, exposure, correlations);
    expect(summary.verdict).toBe(RiskVerdict.CRITICAL);
  });
});
