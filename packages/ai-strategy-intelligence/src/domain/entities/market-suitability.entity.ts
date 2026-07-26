import type { SuitabilityLevel } from "../enums/strategy-intelligence.enum";

/** The result of checking a `Strategy`'s own declared `RiskProfile`
 * against a REAL, unmodified `@rmsm/ai-market-intelligence` (AI-601)
 * `RegimeAnalysis`/`VolatilityAnalysis` — genuine cross-package AI-6xx
 * reuse, never a reimplementation of market analysis here. */
export interface MarketSuitability {
  readonly strategyId: string;
  readonly symbolCode: string;
  readonly level: SuitabilityLevel;
  readonly reason: string;
}
