import type { CorrelationLevel } from "../enums/risk-intelligence.enum";

export interface SymbolCorrelation {
  readonly withSymbolCode: string;
  readonly coefficient: number;
  readonly level: CorrelationLevel;
}

/** Classifies correlation coefficients supplied by a REAL
 * `@rmsm/decision` `RiskEngine.getCorrelationWithOpenPositions()` —
 * never computes a correlation coefficient itself (that needs live
 * price-series data this package doesn't hold). */
export interface CorrelationAnalysis {
  readonly symbolCode: string;
  readonly correlations: readonly SymbolCorrelation[];
  readonly maxAbsoluteCorrelation: number;
}
