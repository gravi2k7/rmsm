import type { PerformanceMetrics } from "@rmsm/portfolio";
import type { BacktestRun } from "../../domain/entities/backtest-run.entity";
import type { PerformanceSummary } from "../../domain/entities/performance-summary.entity";

/** A plain-language narrative wrapper around a REAL
 * `PerformanceMetrics` — never recomputes any of its fields. */
export class PerformanceSummaryService {
  summarize(run: BacktestRun, performance: PerformanceMetrics): PerformanceSummary {
    const narrative = [
      `${performance.totalTrades} trade(s) over the backtest period.`,
      `Realized P&L: ${performance.realizedPnl.toFixed(2)}.`,
      `Win rate: ${performance.winRate.toFixed(0)}%.`,
      `Profit factor: ${Number.isFinite(performance.profitFactor) ? performance.profitFactor.toFixed(2) : "∞"}.`,
      `Sharpe ratio: ${performance.sharpeRatio.toFixed(2)}.`,
      `Maximum drawdown: ${performance.maxDrawdownPercentage.toFixed(1)}%.`,
    ].join(" ");

    return { runId: run.id, narrative };
  }
}
