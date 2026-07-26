import type { Trade } from "@rmsm/portfolio";
import type { TradeDistributionAnalysis, DistributionBucket } from "../../domain/entities/trade-distribution-analysis.entity";
import { EmptyTradeSetError } from "../../domain/errors/backtest-intelligence-domain.errors";

const BUCKETS: ReadonlyArray<readonly [string, (pnl: number) => boolean]> = [
  ["Big Loss (< -500)", (pnl) => pnl < -500],
  ["Loss", (pnl) => pnl >= -500 && pnl < 0],
  ["Breakeven", (pnl) => pnl === 0],
  ["Win", (pnl) => pnl > 0 && pnl <= 500],
  ["Big Win (> 500)", (pnl) => pnl > 500],
];

/** Groups REAL, unmodified `@rmsm/portfolio` `Trade.realizedPnl` values
 * into buckets and computes mean/median/stddev — a genuinely new view
 * `PerformanceService` itself doesn't provide, built only from each
 * trade's own already-computed P&L, never recomputing it. */
export class TradeDistributionAnalysisService {
  analyze(runId: string, trades: readonly Trade[]): TradeDistributionAnalysis {
    if (trades.length === 0) throw new EmptyTradeSetError();

    const pnls = trades.map((t) => t.realizedPnl).sort((a, b) => a - b);
    const buckets: DistributionBucket[] = BUCKETS.map(([rangeLabel, predicate]) => ({ rangeLabel, count: pnls.filter(predicate).length }));

    const mean = pnls.reduce((sum, p) => sum + p, 0) / pnls.length;
    const mid = Math.floor(pnls.length / 2);
    const median = pnls.length % 2 === 0 ? ((pnls[mid - 1] ?? 0) + (pnls[mid] ?? 0)) / 2 : (pnls[mid] ?? 0);
    const variance = pnls.reduce((sum, p) => sum + (p - mean) ** 2, 0) / pnls.length;
    const stdDev = Math.sqrt(variance);

    return { runId, buckets, meanPnl: mean, medianPnl: median, stdDevPnl: stdDev };
  }
}
