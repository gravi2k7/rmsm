import type { Portfolio, PerformanceMetrics, Exposure } from "@rmsm/portfolio";
import type { PortfolioHealth } from "../../domain/entities/portfolio-health.entity";
import { PortfolioHealthVerdict } from "../../domain/enums/portfolio-intelligence.enum";

interface Check {
  readonly passed: boolean;
  readonly reason: string;
}

/**
 * Classifies overall portfolio health from a REAL `@rmsm/portfolio`
 * `PerformanceMetrics` (from its own `PerformanceService`) and a REAL
 * `Exposure` (from its own `RiskMonitorService`) — never recomputes
 * win rate, profit factor, drawdown, or exposure itself.
 */
export class PortfolioHealthService {
  assess(portfolio: Portfolio, performance: PerformanceMetrics, portfolioExposure: Exposure): PortfolioHealth {
    const checks: Check[] = [];

    if (performance.totalTrades > 0) {
      checks.push({ passed: performance.winRate >= 40, reason: `Win rate is ${performance.winRate.toFixed(0)}%.` });
      checks.push({ passed: performance.profitFactor >= 1, reason: `Profit factor is ${performance.profitFactor.toFixed(2)}.` });
    }
    checks.push({ passed: performance.maxDrawdownPercentage < 20, reason: `Maximum drawdown is ${performance.maxDrawdownPercentage.toFixed(1)}%.` });
    checks.push({ passed: portfolioExposure.percentage < 100, reason: `Portfolio-wide exposure is ${portfolioExposure.percentage.toFixed(0)}%.` });
    checks.push({ passed: portfolio.buyingPower >= 0, reason: `Buying power is ${portfolio.buyingPower.toFixed(2)}.` });

    const failed = checks.filter((c) => !c.passed);
    const reasons = failed.length > 0 ? failed.map((c) => c.reason) : ["All health checks passed."];

    const verdict = failed.length === 0 ? PortfolioHealthVerdict.HEALTHY : failed.length === 1 ? PortfolioHealthVerdict.CAUTION : PortfolioHealthVerdict.AT_RISK;

    return { portfolioId: portfolio.id, verdict, reasons };
  }
}
