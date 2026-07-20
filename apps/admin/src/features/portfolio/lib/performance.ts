import type { Trade } from "../types";

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  realizedPnl: number;
}

/**
 * Computed entirely client-side from `GET /trades` — there is no
 * dedicated performance/statistics endpoint for Portfolio in the
 * existing API (Phase 4A exposed `GET /portfolio`, `GET /positions`,
 * `GET /trades` only). Rather than fabricate a fake metric or silently
 * omit "Performance" from this monitoring page, these are real
 * calculations over real trade data already available — the same
 * win-rate/profit-factor formulas `@rmsm/portfolio`'s own
 * `PerformanceService` uses, reimplemented here at the display layer
 * since that service itself isn't reachable over HTTP.
 */
export function computePerformanceMetrics(trades: readonly Trade[]): PerformanceMetrics {
  if (trades.length === 0) {
    return { totalTrades: 0, winRate: 0, profitFactor: 0, realizedPnl: 0 };
  }

  const wins = trades.filter((t) => t.isWin).length;
  const grossProfit = trades.filter((t) => t.realizedPnl > 0).reduce((sum, t) => sum + t.realizedPnl, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.realizedPnl < 0).reduce((sum, t) => sum + t.realizedPnl, 0));

  return {
    totalTrades: trades.length,
    winRate: (wins / trades.length) * 100,
    profitFactor: grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss,
    realizedPnl: trades.reduce((sum, t) => sum + t.realizedPnl, 0),
  };
}

export interface CumulativePnlPoint {
  date: string;
  cumulativePnl: number;
}

/** A cumulative realized-P&L series over time — genuinely different from
 * a true portfolio equity curve (which would also need unrealized P&L
 * and live prices this admin console has no source for) and
 * deliberately labeled as such wherever it's displayed, not presented
 * as "equity" when it isn't. */
export function computeCumulativePnl(trades: readonly Trade[]): CumulativePnlPoint[] {
  const sorted = [...trades].sort((a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime());
  let running = 0;
  return sorted.map((trade) => {
    running += trade.realizedPnl;
    return { date: new Date(trade.closedAt).toLocaleDateString(), cumulativePnl: running };
  });
}
