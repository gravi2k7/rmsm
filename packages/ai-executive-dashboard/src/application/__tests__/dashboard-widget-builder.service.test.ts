import { describe, expect, it } from "vitest";
import { unwrap } from "@rmsm/core";
import { SymbolCode, Candle, Price, Volume, Timeframe } from "@rmsm/market";
import {
  MarketAnalysisService,
  MarketRegimeService,
  MarketScoringService,
  MarketAlertService,
  MarketSummaryService,
} from "@rmsm/ai-market-intelligence";
import { PortfolioHealthVerdict, DiversificationLevel } from "@rmsm/ai-portfolio-intelligence";
import { RiskVerdict } from "@rmsm/ai-risk-intelligence";
import { DashboardWidgetBuilderService } from "../services/dashboard-widget-builder.service";
import { WidgetType } from "../../domain/enums/executive-dashboard.enum";
import { FixedClock, SequentialIdGenerator } from "./fakes";

function buildCandles(closes: readonly number[], symbolCode: SymbolCode): Candle[] {
  return closes.map((close, index) => {
    const open = index === 0 ? close : closes[index - 1]!;
    const high = Math.max(open, close) + 0.0005;
    const low = Math.min(open, close) - 0.0005;
    const price = (amount: number) => unwrap(Price.create(amount, 5));
    return Candle.hydrate(`c-${index}`, symbolCode, Timeframe.M1, new Date(Date.UTC(2026, 0, 1, 0, index)), price(open), price(high), price(low), price(close), unwrap(Volume.create(1000)));
  });
}

describe("DashboardWidgetBuilderService", () => {
  const builder = new DashboardWidgetBuilderService(new SequentialIdGenerator(), new FixedClock());

  it("wraps a REAL AI-601 MarketSummary.narrative into a MARKET widget, without altering it", async () => {
    const marketAnalysis = new MarketAnalysisService();
    const summaryService = new MarketSummaryService(
      marketAnalysis,
      new MarketRegimeService(marketAnalysis),
      new MarketScoringService(marketAnalysis),
      new MarketAlertService(marketAnalysis),
      new FixedClock(),
      new SequentialIdGenerator(),
    );
    const symbolCode = unwrap(SymbolCode.create("EURUSD"));
    const candles = buildCandles([1.1, 1.11, 1.12, 1.13, 1.14, 1.15], symbolCode);
    const marketSummary = await summaryService.generate(symbolCode, candles);

    const widget = builder.fromMarketSummary(marketSummary);
    expect(widget.type).toBe(WidgetType.MARKET);
    expect(widget.body).toBe(marketSummary.narrative);
    expect(widget.title).toContain("EURUSD");
  });

  it("wraps a REAL-shaped AI-604 PortfolioSummary.narrative into a PORTFOLIO widget", () => {
    const portfolioSummary = {
      portfolioId: "p1",
      health: { portfolioId: "p1", verdict: PortfolioHealthVerdict.HEALTHY, reasons: [] },
      diversification: { portfolioId: "p1", level: DiversificationLevel.WELL_DIVERSIFIED, herfindahlIndex: 0.1, reason: "" },
      narrative: "Portfolio p1 is healthy and well diversified.",
      generatedAt: new Date(),
    };
    const widget = builder.fromPortfolioSummary(portfolioSummary);
    expect(widget.type).toBe(WidgetType.PORTFOLIO);
    expect(widget.body).toBe(portfolioSummary.narrative);
  });

  it("wraps a REAL-shaped AI-605 RiskIntelligenceReport.narrative into a RISK widget", () => {
    const riskReport = {
      subjectId: "p1",
      riskAnalysis: { subjectId: "p1", verdict: RiskVerdict.ACCEPTABLE, overallScore: 10, reasons: [] },
      drawdownAnalysis: { portfolioId: "p1", currentDrawdownPercentage: 2, historicalMaxDrawdownPercentage: 5, verdict: RiskVerdict.ACCEPTABLE, reason: "" },
      alerts: [],
      recommendation: { subjectId: "p1", action: "HOLD" as never, rationale: "" },
      narrative: "Risk for p1 is ACCEPTABLE.",
      generatedAt: new Date(),
    };
    const widget = builder.fromRiskReport(riskReport);
    expect(widget.type).toBe(WidgetType.RISK);
    expect(widget.body).toBe(riskReport.narrative);
  });
});
