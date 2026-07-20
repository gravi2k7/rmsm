import type { Position, Trade } from "../types";

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
 * omit "Performance" from the dashboard, these are real calculations
 * over real trade data already available — the same win-rate/
 * profit-factor formulas `@rmsm/portfolio`'s own `PerformanceService`
 * uses, reimplemented here at the display layer since that service
 * itself isn't reachable over HTTP.
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

function isToday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

/** Sum of `realizedPnl` for trades closed today. Distinct from all-time
 * `realizedPnl` above — the Dashboard's "Daily P&L" widget wants today
 * only. */
export function computeTodaysRealizedPnl(trades: readonly Trade[]): number {
  return trades.filter((t) => isToday(t.closedAt)).reduce((sum, t) => sum + t.realizedPnl, 0);
}

export interface CumulativePnlPoint {
  date: string;
  cumulativePnl: number;
}

/** A cumulative realized-P&L series over time — genuinely different from
 * a true portfolio equity curve (which would also need live prices this
 * console has no source for) and deliberately labeled as such wherever
 * it's displayed, not presented as "equity" when it isn't. */
export function computeCumulativePnl(trades: readonly Trade[]): CumulativePnlPoint[] {
  const sorted = [...trades].sort((a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime());
  let running = 0;
  return sorted.map((trade) => {
    running += trade.realizedPnl;
    return { date: new Date(trade.closedAt).toLocaleDateString(), cumulativePnl: running };
  });
}

/**
 * Unrealized P&L for currently OPEN positions, given a price lookup
 * function. Real and honest, but genuinely best-effort: `Position` is
 * keyed by `symbolCode` (the Strategy/Portfolio domain's own symbol
 * identifier), while live prices come from the separate market-data
 * module's `Instrument`/`Quote` records, keyed by `instrumentId`. There
 * is no API-provided mapping between the two — this resolves it by a
 * case-insensitive match against `Instrument.symbol`, which works for
 * the common case but isn't guaranteed. Positions whose price can't be
 * resolved are excluded from the total (returned separately as
 * `unresolvedCount`) rather than silently treated as zero.
 */
export function computeUnrealizedPnl(
  positions: readonly Position[],
  getCurrentPrice: (symbolCode: string) => number | null,
): { total: number; resolvedCount: number; unresolvedCount: number } {
  const open = positions.filter((p) => p.status === "OPEN");
  let total = 0;
  let resolvedCount = 0;
  let unresolvedCount = 0;

  for (const position of open) {
    const currentPrice = getCurrentPrice(position.symbolCode);
    if (currentPrice === null) {
      unresolvedCount += 1;
      continue;
    }
    const direction = position.side === "LONG" ? 1 : -1;
    total += direction * (currentPrice - position.averageEntryPrice) * position.quantityUnits;
    resolvedCount += 1;
  }

  return { total, resolvedCount, unresolvedCount };
}
