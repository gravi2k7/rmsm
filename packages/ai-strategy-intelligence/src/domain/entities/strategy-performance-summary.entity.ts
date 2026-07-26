export interface StrategyPerformanceSummary {
  readonly strategyId: string;
  readonly totalTrades: number;
  readonly winRate: number;
  readonly averageReturn: number;
  readonly generatedAt: Date;
}
