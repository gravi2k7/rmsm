import type { Clock } from "@rmsm/core";
import { SystemClock } from "@rmsm/core";
import type { PortfolioReport } from "../../domain/entities/portfolio-report.entity";
import type { RiskReport } from "../../domain/entities/risk-report.entity";
import type { PerformanceReport } from "../../domain/entities/performance-report.entity";
import type { ExecutiveSummary } from "../../domain/entities/executive-summary.entity";

/** Composes three already-generated reports (each reading REAL AI-604/
 * AI-605/@rmsm/portfolio data, never recomputed here) into one
 * headline-plus-bullets executive view. */
export class ExecutiveSummaryService {
  constructor(private readonly clock: Clock = new SystemClock()) {}

  summarize(portfolioReport: PortfolioReport, riskReport: RiskReport, performanceReport: PerformanceReport): ExecutiveSummary {
    const headline = `${portfolioReport.portfolioId} is ${portfolioReport.health.verdict}, risk is ${riskReport.riskAnalysis.verdict}, performance shows ${performanceReport.metrics.winRate.toFixed(0)}% win rate over ${performanceReport.metrics.totalTrades} trade(s).`;

    const keyPoints = [
      `Portfolio health: ${portfolioReport.health.verdict} — ${portfolioReport.diversification.level} diversification.`,
      `Risk: ${riskReport.riskAnalysis.verdict}, drawdown ${riskReport.drawdown.verdict}, ${riskReport.alerts.length} active alert(s).`,
      `Performance: realized P&L ${performanceReport.metrics.realizedPnl.toFixed(2)}, profit factor ${Number.isFinite(performanceReport.metrics.profitFactor) ? performanceReport.metrics.profitFactor.toFixed(2) : "∞"}.`,
    ];

    return { portfolioId: portfolioReport.portfolioId, period: portfolioReport.period, headline, keyPoints, generatedAt: this.clock.now() };
  }
}
