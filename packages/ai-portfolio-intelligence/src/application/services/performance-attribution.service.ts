import type { Trade } from "@rmsm/portfolio";
import type { PerformanceAttribution, SymbolAttribution } from "../../domain/entities/performance-attribution.entity";

/** Groups REAL, unmodified `@rmsm/portfolio` `Trade` records by symbol —
 * a genuinely new view (per-symbol breakdown) that `PerformanceService`
 * itself doesn't provide, built only from `Trade`'s own fields, never
 * recomputing an individual trade's own realized P&L or win/loss status. */
export class PerformanceAttributionService {
  attribute(portfolioId: string, trades: readonly Trade[]): PerformanceAttribution {
    const bySymbol = new Map<string, { realizedPnl: number; tradeCount: number; wins: number }>();

    for (const trade of trades) {
      const key = trade.symbolCode.value;
      const existing = bySymbol.get(key) ?? { realizedPnl: 0, tradeCount: 0, wins: 0 };
      existing.realizedPnl += trade.realizedPnl;
      existing.tradeCount += 1;
      if (trade.isWin()) existing.wins += 1;
      bySymbol.set(key, existing);
    }

    const attribution: SymbolAttribution[] = [...bySymbol.entries()].map(([symbolCode, entry]) => ({
      symbolCode,
      realizedPnl: entry.realizedPnl,
      tradeCount: entry.tradeCount,
      winRate: entry.tradeCount === 0 ? 0 : (entry.wins / entry.tradeCount) * 100,
    }));

    return { portfolioId, bySymbol: attribution };
  }
}
