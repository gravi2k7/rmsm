import type { VolatilityLevel } from "../enums/market-intelligence.enum";

export interface VolatilityAnalysis {
  readonly level: VolatilityLevel;
  /** Standard deviation of bar-to-bar percentage returns. */
  readonly returnStdDev: number;
}
