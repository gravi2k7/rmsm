import type { CorrelationAnalysis, SymbolCorrelation } from "../../domain/entities/correlation-analysis.entity";
import { CorrelationLevel } from "../../domain/enums/risk-intelligence.enum";
import { EmptyCorrelationSetError } from "../../domain/errors/risk-intelligence-domain.errors";

export interface RawCorrelation {
  readonly withSymbolCode: string;
  readonly coefficient: number;
}

/**
 * Classifies correlation coefficients supplied by a REAL
 * `@rmsm/decision` `RiskEngine.getCorrelationWithOpenPositions()` call
 * per open position — never computes a coefficient itself, since that
 * needs live price-series data this package doesn't hold.
 */
export class CorrelationAnalysisService {
  analyze(symbolCode: string, correlations: readonly RawCorrelation[]): CorrelationAnalysis {
    if (correlations.length === 0) throw new EmptyCorrelationSetError();

    const classified: SymbolCorrelation[] = correlations.map((c) => {
      const abs = Math.abs(c.coefficient);
      const level = abs >= 0.7 ? CorrelationLevel.HIGH : abs >= 0.4 ? CorrelationLevel.MODERATE : CorrelationLevel.LOW;
      return { withSymbolCode: c.withSymbolCode, coefficient: c.coefficient, level };
    });

    const maxAbsoluteCorrelation = Math.max(...classified.map((c) => Math.abs(c.coefficient)));

    return { symbolCode, correlations: classified, maxAbsoluteCorrelation };
  }
}
