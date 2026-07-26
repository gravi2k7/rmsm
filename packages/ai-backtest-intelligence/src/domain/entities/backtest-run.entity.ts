import type { Trade } from "@rmsm/portfolio";

/** The consumer-facing shape this package analyzes — a completed
 * backtest's own real `@rmsm/portfolio` `Trade` history. This package
 * never runs a backtest itself (no simulation engine here); it only
 * interprets results already produced elsewhere. */
export interface BacktestRun {
  readonly id: string;
  readonly strategyId: string;
  readonly symbolCode: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly trades: readonly Trade[];
}
