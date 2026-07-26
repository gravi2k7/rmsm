import type { LiquidityLevel } from "../enums/market-intelligence.enum";

export interface LiquidityAnalysis {
  readonly level: LiquidityLevel;
  readonly averageVolumeUnits: number;
}
