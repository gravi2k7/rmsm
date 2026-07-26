import type { BacktestVerdict } from "../enums/backtest-intelligence.enum";

/** Reads a REAL, unmodified `@rmsm/portfolio` `PerformanceMetrics` (from
 * its own `PerformanceService.computeMetrics()`) — never recomputes win
 * rate, profit factor, Sharpe ratio, or drawdown itself. */
export interface BacktestInterpretation {
  readonly runId: string;
  readonly verdict: BacktestVerdict;
  readonly reasons: readonly string[];
}
