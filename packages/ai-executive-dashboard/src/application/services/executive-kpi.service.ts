import type { PerformanceMetrics } from "@rmsm/portfolio";
import type { PortfolioHealth } from "@rmsm/ai-portfolio-intelligence";
import type { ExecutiveKpiSet } from "../../domain/entities/executive-kpi.entity";

/** Relabels a REAL `@rmsm/portfolio` `PerformanceMetrics` (from
 * `PerformanceService.computeMetrics()`) and a REAL
 * `@rmsm/ai-portfolio-intelligence` (AI-604) `PortfolioHealth` into
 * named KPIs — never recomputes win rate, profit factor, drawdown, or
 * health verdict itself. */
export class ExecutiveKpiService {
  build(portfolioId: string, performance: PerformanceMetrics, health: PortfolioHealth): ExecutiveKpiSet {
    return {
      portfolioId,
      kpis: [
        { name: "Total Trades", value: performance.totalTrades },
        { name: "Realized P&L", value: performance.realizedPnl },
        { name: "Win Rate", value: performance.winRate, unit: "%" },
        { name: "Profit Factor", value: Number.isFinite(performance.profitFactor) ? performance.profitFactor : Number.MAX_SAFE_INTEGER },
        { name: "Sharpe Ratio", value: performance.sharpeRatio },
        { name: "Max Drawdown", value: performance.maxDrawdownPercentage, unit: "%" },
        { name: "Health Checks Passed", value: health.reasons.filter((r) => r === "All health checks passed.").length > 0 ? 1 : 0 },
      ],
    };
  }
}
