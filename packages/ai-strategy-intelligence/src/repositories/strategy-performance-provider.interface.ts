/**
 * The port to real trade-history/backtest performance data — implemented
 * entirely outside this package (execution/backtest infrastructure).
 * Ships with ZERO implementations, same "future seam" pattern as
 * `@rmsm/ai-market-intelligence`'s own `IndicatorProvider`:
 * `StrategyPerformanceAnalysisService` degrades to returning `null`
 * (documented, not silently wrong) until a real adapter is wired in.
 */
export interface StrategyPerformanceProvider {
  getPerformance(strategyId: string): Promise<{
    readonly totalTrades: number;
    readonly winRate: number;
    readonly averageReturn: number;
  } | null>;
}
