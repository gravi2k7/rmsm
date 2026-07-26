import type { PerformanceMetrics } from "@rmsm/portfolio";
import type { BacktestRun } from "../../domain/entities/backtest-run.entity";
import type { BacktestInterpretation } from "../../domain/entities/backtest-interpretation.entity";
import { BacktestVerdict } from "../../domain/enums/backtest-intelligence.enum";

/** Classifies a REAL, unmodified `@rmsm/portfolio` `PerformanceMetrics`
 * (from its own `PerformanceService.computeMetrics()`) — never
 * recomputes win rate, profit factor, Sharpe ratio, or drawdown. */
export class BacktestInterpretationService {
  interpret(run: BacktestRun, performance: PerformanceMetrics): BacktestInterpretation {
    const reasons: string[] = [];

    if (performance.totalTrades === 0) {
      return { runId: run.id, verdict: BacktestVerdict.WEAK, reasons: ["No trades were recorded for this run."] };
    }

    if (performance.profitFactor < 1) reasons.push(`Profit factor is ${performance.profitFactor.toFixed(2)}, below breakeven.`);
    if (performance.winRate < 40) reasons.push(`Win rate is ${performance.winRate.toFixed(0)}%.`);
    if (performance.maxDrawdownPercentage > 25) reasons.push(`Maximum drawdown is ${performance.maxDrawdownPercentage.toFixed(1)}%.`);
    if (performance.sharpeRatio < 0) reasons.push(`Sharpe ratio is negative (${performance.sharpeRatio.toFixed(2)}).`);

    if (reasons.length === 0) reasons.push(`Profit factor ${performance.profitFactor.toFixed(2)}, win rate ${performance.winRate.toFixed(0)}%.`);

    const verdict =
      reasons.length === 0 || (performance.profitFactor >= 1.5 && performance.winRate >= 50)
        ? BacktestVerdict.STRONG
        : reasons.length <= 1
          ? BacktestVerdict.MARGINAL
          : BacktestVerdict.WEAK;

    return { runId: run.id, verdict, reasons };
  }
}
