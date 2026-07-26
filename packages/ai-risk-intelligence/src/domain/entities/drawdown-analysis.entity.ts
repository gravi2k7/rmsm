import type { RiskVerdict } from "../enums/risk-intelligence.enum";

/** Reads a REAL `@rmsm/portfolio` `Portfolio.peakEquity` and a REAL
 * `PerformanceService.maxDrawdown()` result — never recomputes either. */
export interface DrawdownAnalysis {
  readonly portfolioId: string;
  readonly currentDrawdownPercentage: number;
  readonly historicalMaxDrawdownPercentage: number;
  readonly verdict: RiskVerdict;
  readonly reason: string;
}
