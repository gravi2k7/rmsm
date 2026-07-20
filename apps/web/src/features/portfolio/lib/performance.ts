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

/** Sum of `realizedPnl` for trades closed within the last 7 days. */
export function computeWeeklyRealizedPnl(trades: readonly Trade[], now: Date = new Date()): number {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return trades.filter((t) => new Date(t.closedAt) >= weekAgo).reduce((sum, t) => sum + t.realizedPnl, 0);
}

/** Sum of `realizedPnl` for trades closed within the last 30 days. */
export function computeMonthlyRealizedPnl(trades: readonly Trade[], now: Date = new Date()): number {
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return trades.filter((t) => new Date(t.closedAt) >= monthAgo).reduce((sum, t) => sum + t.realizedPnl, 0);
}

export interface DrawdownResult {
  /** The largest peak-to-trough decline in the cumulative realized P&L
   * series, in currency units (not a fraction of equity — this app has
   * no historical equity series, only cumulative realized P&L, so this
   * is drawdown on *that* series, consistently labeled as such
   * everywhere it's shown). */
  maxDrawdown: number;
  maxDrawdownPct: number;
}

/** Computed over the same cumulative-realized-P&L series as
 * `computeCumulativePnl` — deliberately not a true equity drawdown
 * (which would need a live/historical price feed this console has no
 * source for), consistent with that function's own documented scope. */
export function computeDrawdown(trades: readonly Trade[]): DrawdownResult {
  const series = computeCumulativePnl(trades);
  let peak = 0;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;

  for (const point of series) {
    if (point.cumulativePnl > peak) peak = point.cumulativePnl;
    const drawdown = peak - point.cumulativePnl;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPct = peak > 0 ? (drawdown / peak) * 100 : 0;
    }
  }

  return { maxDrawdown, maxDrawdownPct };
}

export interface WinLossAverages {
  averageWinner: number;
  averageLoser: number;
  riskRewardRatio: number;
}

export function computeWinLossAverages(trades: readonly Trade[]): WinLossAverages {
  const winners = trades.filter((t) => t.realizedPnl > 0);
  const losers = trades.filter((t) => t.realizedPnl < 0);
  const averageWinner = winners.length > 0 ? winners.reduce((sum, t) => sum + t.realizedPnl, 0) / winners.length : 0;
  const averageLoser = losers.length > 0 ? losers.reduce((sum, t) => sum + t.realizedPnl, 0) / losers.length : 0;
  return {
    averageWinner,
    averageLoser,
    riskRewardRatio: averageLoser !== 0 ? Math.abs(averageWinner / averageLoser) : 0,
  };
}

export interface InstrumentPerformance {
  symbolCode: string;
  tradeCount: number;
  realizedPnl: number;
  winRate: number;
}

/** Real, direct correlation — `Trade.symbolCode` exists, unlike the
 * strategy-id correlation gap documented in the Strategy Center
 * (features/strategy-summary/hooks — see that file's own note). */
export function computePerformanceByInstrument(trades: readonly Trade[]): InstrumentPerformance[] {
  const bySymbol = new Map<string, Trade[]>();
  for (const trade of trades) {
    const list = bySymbol.get(trade.symbolCode) ?? [];
    list.push(trade);
    bySymbol.set(trade.symbolCode, list);
  }

  return Array.from(bySymbol.entries())
    .map(([symbolCode, symbolTrades]) => ({
      symbolCode,
      tradeCount: symbolTrades.length,
      realizedPnl: symbolTrades.reduce((sum, t) => sum + t.realizedPnl, 0),
      winRate: (symbolTrades.filter((t) => t.isWin).length / symbolTrades.length) * 100,
    }))
    .sort((a, b) => b.realizedPnl - a.realizedPnl);
}

export interface HoldingDurationBucket {
  label: string;
  tradeCount: number;
  realizedPnl: number;
  winRate: number;
}

/**
 * "Performance by Timeframe" in the Batch 3 brief — `Trade` has no
 * timeframe/interval field (that's a Strategy/chart-display concept,
 * not recorded per-trade), so this buckets by actual holding duration
 * (`closedAt - openedAt`) instead, which is real, always-available data
 * that serves the same underlying question ("do quick trades or held
 * trades perform better for me?"). Documented here rather than silently
 * relabeling a different metric as "timeframe".
 */
export function computePerformanceByHoldingDuration(trades: readonly Trade[]): HoldingDurationBucket[] {
  const labels = ["< 1 hour", "1-4 hours", "4-24 hours", "1-7 days", "7+ days"] as const;
  const buckets: Trade[][] = labels.map(() => []);

  for (const trade of trades) {
    const hours = (new Date(trade.closedAt).getTime() - new Date(trade.openedAt).getTime()) / (1000 * 60 * 60);
    const index = hours < 1 ? 0 : hours < 4 ? 1 : hours < 24 ? 2 : hours < 24 * 7 ? 3 : 4;
    buckets[index]?.push(trade);
  }

  return labels
    .map((label, i) => {
      const list = buckets[i] ?? [];
      return {
        label,
        tradeCount: list.length,
        realizedPnl: list.reduce((sum, t) => sum + t.realizedPnl, 0),
        winRate: list.length > 0 ? (list.filter((t) => t.isWin).length / list.length) * 100 : 0,
      };
    })
    .filter((bucket) => bucket.tradeCount > 0);
}

export interface CalendarDayPnl {
  date: string;
  realizedPnl: number;
  tradeCount: number;
}

/** One entry per calendar day that had at least one closed trade — the
 * data source for the Performance Calendar / heatmap. */
export function computeDailyPnlCalendar(trades: readonly Trade[]): CalendarDayPnl[] {
  const byDay = new Map<string, Trade[]>();
  for (const trade of trades) {
    const day = new Date(trade.closedAt).toISOString().slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(trade);
    byDay.set(day, list);
  }
  return Array.from(byDay.entries())
    .map(([date, list]) => ({ date, realizedPnl: list.reduce((sum, t) => sum + t.realizedPnl, 0), tradeCount: list.length }))
    .sort((a, b) => a.date.localeCompare(b.date));
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
