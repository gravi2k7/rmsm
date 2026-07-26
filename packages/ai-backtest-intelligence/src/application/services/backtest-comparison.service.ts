import type { PerformanceMetrics } from "@rmsm/portfolio";
import type { BacktestComparison } from "../../domain/entities/backtest-comparison.entity";
import { InvalidComparisonSetError } from "../../domain/errors/backtest-intelligence-domain.errors";

export interface BacktestComparisonInput {
  readonly runId: string;
  readonly strategyId: string;
  readonly performance: PerformanceMetrics;
}

/** Ranks backtest runs purely from REAL, unmodified `PerformanceMetrics`
 * — sorting and aggregation only, no new performance calculation. */
export class BacktestComparisonService {
  compare(inputs: readonly BacktestComparisonInput[]): BacktestComparison {
    if (inputs.length < 2) throw new InvalidComparisonSetError(inputs.length);

    const entries = inputs.map((input) => ({
      runId: input.runId,
      strategyId: input.strategyId,
      netPnl: input.performance.realizedPnl,
      winRate: input.performance.winRate,
      profitFactor: input.performance.profitFactor,
      sharpeRatio: input.performance.sharpeRatio,
    }));

    const winner = entries.reduce((best, entry) => {
      if (!best) return entry;
      if (entry.profitFactor > best.profitFactor) return entry;
      if (entry.profitFactor === best.profitFactor && entry.winRate > best.winRate) return entry;
      return best;
    }, entries[0]);

    return { entries, winnerRunId: winner?.runId ?? null };
  }
}
