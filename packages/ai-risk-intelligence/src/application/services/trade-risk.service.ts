import type { Trade } from "@rmsm/portfolio";
import type { TradeRisk } from "../../domain/entities/trade-risk.entity";
import { RiskVerdict } from "../../domain/enums/risk-intelligence.enum";

/** Reads a REAL, unmodified `@rmsm/portfolio` `Trade`'s own
 * `realizedPnl` against portfolio equity at the time of the trade —
 * never recomputes the trade's own P&L. */
export class TradeRiskService {
  assess(trade: Trade, portfolioEquityAtTradeTime: number): TradeRisk {
    const loss = trade.realizedPnl < 0 ? Math.abs(trade.realizedPnl) : 0;
    const lossPercentageOfEquity = portfolioEquityAtTradeTime <= 0 ? 0 : (loss / portfolioEquityAtTradeTime) * 100;

    const verdict = lossPercentageOfEquity < 2 ? RiskVerdict.ACCEPTABLE : lossPercentageOfEquity < 5 ? RiskVerdict.ELEVATED : RiskVerdict.CRITICAL;

    return { tradeId: trade.id, symbolCode: trade.symbolCode.value, lossPercentageOfEquity, verdict };
  }
}
