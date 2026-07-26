import type { RiskVerdict } from "../enums/risk-intelligence.enum";

/** Reads a REAL, unmodified `@rmsm/portfolio` `Trade`'s own
 * `realizedPnl` against portfolio equity at the time — never recomputes
 * the trade's own P&L. */
export interface TradeRisk {
  readonly tradeId: string;
  readonly symbolCode: string;
  readonly lossPercentageOfEquity: number;
  readonly verdict: RiskVerdict;
}
