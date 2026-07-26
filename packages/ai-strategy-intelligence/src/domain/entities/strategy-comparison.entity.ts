export interface StrategyComparisonEntry {
  readonly strategyId: string;
  readonly name: string;
  readonly completenessScore: number;
  readonly riskScore: number;
}

export interface StrategyComparison {
  readonly entries: readonly StrategyComparisonEntry[];
  readonly winnerStrategyId: string | null;
}
