import type { RiskVerdict } from "../enums/risk-intelligence.enum";

/** Reads a REAL `@rmsm/portfolio` `Position`'s own quantity/entry price
 * against a supplied current price and portfolio equity — capital at
 * risk, not a re-derivation of `Position.unrealizedPnlAt()`. */
export interface PositionRisk {
  readonly positionId: string;
  readonly symbolCode: string;
  readonly capitalAtRisk: number;
  readonly riskPercentageOfEquity: number;
  readonly verdict: RiskVerdict;
}
