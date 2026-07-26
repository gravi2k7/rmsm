export interface BacktestComparisonEntry {
  readonly runId: string;
  readonly strategyId: string;
  readonly netPnl: number;
  readonly winRate: number;
  readonly profitFactor: number;
  readonly sharpeRatio: number;
}

export interface BacktestComparison {
  readonly entries: readonly BacktestComparisonEntry[];
  readonly winnerRunId: string | null;
}
