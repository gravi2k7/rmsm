export interface DistributionBucket {
  readonly rangeLabel: string;
  readonly count: number;
}

export interface TradeDistributionAnalysis {
  readonly runId: string;
  readonly buckets: readonly DistributionBucket[];
  readonly meanPnl: number;
  readonly medianPnl: number;
  readonly stdDevPnl: number;
}
