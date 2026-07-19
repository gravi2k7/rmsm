import type { Trade } from "../entities/trade";
import type { Equity } from "../entities/equity";

export interface PerformanceMetrics {
  readonly realizedPnl: number;
  readonly winRate: number;
  readonly profitFactor: number;
  readonly sharpeRatio: number;
  readonly maxDrawdownPercentage: number;
  readonly totalTrades: number;
}

/**
 * Computes this domain's own required performance metrics — Realized
 * P&L, Win Rate, Profit Factor, Sharpe Ratio, Maximum Drawdown — from a
 * closed-trade history and an equity curve. Pure calculation: no
 * infrastructure, no live pricing (unrealized P&L is `PortfolioService`'s
 * own concern, computed from *current* prices; this service only looks
 * backward at what already happened).
 */
export class PerformanceService {
  computeMetrics(trades: readonly Trade[], equityCurve: readonly Equity[]): PerformanceMetrics {
    return {
      realizedPnl: this.realizedPnl(trades),
      winRate: this.winRate(trades),
      profitFactor: this.profitFactor(trades),
      sharpeRatio: this.sharpeRatio(equityCurve),
      maxDrawdownPercentage: this.maxDrawdown(equityCurve),
      totalTrades: trades.length,
    };
  }

  realizedPnl(trades: readonly Trade[]): number {
    return trades.reduce((sum, trade) => sum + trade.realizedPnl, 0);
  }

  /** Percentage of trades that closed with a positive realized P&L —
   * `0` (not `NaN`) when there's no trade history yet, since "no data"
   * and "0% win rate" both correctly read as "nothing to report." */
  winRate(trades: readonly Trade[]): number {
    if (trades.length === 0) return 0;
    const wins = trades.filter((t) => t.isWin()).length;
    return (wins / trades.length) * 100;
  }

  /** Gross profit divided by gross loss (as a positive number) —
   * `Infinity` when there are wins and zero losses (a genuinely
   * undefined-denominator case, not an error), `0` when there's no
   * trade history at all. */
  profitFactor(trades: readonly Trade[]): number {
    const grossProfit = trades.filter((t) => t.realizedPnl > 0).reduce((sum, t) => sum + t.realizedPnl, 0);
    const grossLoss = Math.abs(trades.filter((t) => t.realizedPnl < 0).reduce((sum, t) => sum + t.realizedPnl, 0));
    if (trades.length === 0) return 0;
    if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
    return grossProfit / grossLoss;
  }

  /** The standard Sharpe ratio: mean period-over-period return divided
   * by its own standard deviation — computed directly from the equity
   * curve's own consecutive-point returns (no assumed risk-free rate,
   * since this domain has no configuration source for one; a caller
   * wanting excess-return Sharpe subtracts their own risk-free rate from
   * the result). Requires at least 2 equity points to compute any return
   * at all; returns `0` otherwise rather than dividing by a
   * zero-length series. */
  sharpeRatio(equityCurve: readonly Equity[]): number {
    if (equityCurve.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const previous = equityCurve[i - 1]!.value;
      const current = equityCurve[i]!.value;
      if (previous === 0) continue;
      returns.push((current - previous) / previous);
    }
    if (returns.length === 0) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev === 0 ? 0 : mean / stdDev;
  }

  /** The largest peak-to-trough decline anywhere in the equity curve, as
   * a percentage — distinct from `Portfolio`'s own live
   * `checkDrawdown()` (which only ever compares *current* equity against
   * the running peak); this walks the *entire historical* curve to find
   * the worst drawdown that ever occurred, even if the portfolio has
   * since recovered past it. */
  maxDrawdown(equityCurve: readonly Equity[]): number {
    if (equityCurve.length === 0) return 0;

    let peak = equityCurve[0]!.value;
    let maxDrawdownPct = 0;
    for (const point of equityCurve) {
      if (point.value > peak) peak = point.value;
      const drawdownPct = peak === 0 ? 0 : ((peak - point.value) / peak) * 100;
      if (drawdownPct > maxDrawdownPct) maxDrawdownPct = drawdownPct;
    }
    return maxDrawdownPct;
  }
}
