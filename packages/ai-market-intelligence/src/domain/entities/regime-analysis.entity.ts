import type { MarketRegime } from "../enums/market-intelligence.enum";

export interface RegimeAnalysis {
  readonly regime: MarketRegime;
  readonly confidence: number;
  readonly reason: string;
}
