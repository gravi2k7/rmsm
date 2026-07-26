import type { Position } from "@rmsm/portfolio";
import type { PositionRisk } from "../../domain/entities/position-risk.entity";
import { RiskVerdict } from "../../domain/enums/risk-intelligence.enum";

/** Reads a REAL `@rmsm/portfolio` `Position`'s own quantity and entry
 * price against a supplied current price and portfolio equity — capital
 * at risk (current market value of the position), not a re-derivation
 * of `Position.unrealizedPnlAt()`. */
export class PositionRiskService {
  assess(position: Position, currentPrice: number, portfolioEquity: number): PositionRisk {
    const capitalAtRisk = position.quantityUnits * currentPrice;
    const riskPercentageOfEquity = portfolioEquity <= 0 ? 0 : (capitalAtRisk / portfolioEquity) * 100;

    const verdict = riskPercentageOfEquity < 20 ? RiskVerdict.ACCEPTABLE : riskPercentageOfEquity < 35 ? RiskVerdict.ELEVATED : RiskVerdict.CRITICAL;

    return { positionId: position.id, symbolCode: position.symbolCode.value, capitalAtRisk, riskPercentageOfEquity, verdict };
  }
}
