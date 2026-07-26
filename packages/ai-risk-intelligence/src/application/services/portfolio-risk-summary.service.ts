import type { DrawdownAnalysis } from "../../domain/entities/drawdown-analysis.entity";
import type { ExposureMonitoringResult } from "../../domain/entities/exposure-monitoring-result.entity";
import type { CorrelationAnalysis } from "../../domain/entities/correlation-analysis.entity";
import type { PortfolioRiskSummary } from "../../domain/entities/portfolio-risk-summary.entity";
import { RiskVerdict } from "../../domain/enums/risk-intelligence.enum";

/** Composes drawdown + exposure + correlation analyses (each produced
 * elsewhere in this package, never recomputed here) into one weighted
 * 0..100 risk score and verdict. */
export class PortfolioRiskSummaryService {
  summarize(portfolioId: string, drawdown: DrawdownAnalysis, exposure: ExposureMonitoringResult, correlations: readonly CorrelationAnalysis[]): PortfolioRiskSummary {
    const drawdownComponent = Math.min(100, drawdown.currentDrawdownPercentage * 3);
    const exposureComponent = exposure.exposures.length === 0 ? 0 : Math.max(...exposure.exposures.map((e) => e.percentage));
    const correlationComponent = correlations.length === 0 ? 0 : Math.max(...correlations.map((c) => c.maxAbsoluteCorrelation * 100));

    const overallScore = drawdownComponent * 0.4 + exposureComponent * 0.35 + correlationComponent * 0.25;
    const verdict = overallScore < 30 ? RiskVerdict.ACCEPTABLE : overallScore < 60 ? RiskVerdict.ELEVATED : RiskVerdict.CRITICAL;

    return {
      portfolioId,
      overallScore: Math.max(0, Math.min(100, overallScore)),
      verdict,
      componentScores: { drawdown: drawdownComponent, exposure: exposureComponent, correlation: correlationComponent },
    };
  }
}
