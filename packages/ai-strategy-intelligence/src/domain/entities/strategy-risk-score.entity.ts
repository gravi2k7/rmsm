import type { RiskScoreBand } from "../enums/strategy-intelligence.enum";

export interface StrategyRiskScore {
  readonly strategyId: string;
  /** 0..100 */
  readonly riskScore: number;
  readonly band: RiskScoreBand;
}
