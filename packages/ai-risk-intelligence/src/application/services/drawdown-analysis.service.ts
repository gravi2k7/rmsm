import type { Portfolio } from "@rmsm/portfolio";
import type { DrawdownAnalysis } from "../../domain/entities/drawdown-analysis.entity";
import { RiskVerdict } from "../../domain/enums/risk-intelligence.enum";

/** Reads a REAL `@rmsm/portfolio` `Portfolio.peakEquity` (never
 * recomputed) against a supplied current equity, plus a REAL
 * `PerformanceService.maxDrawdown()` result for historical context. */
export class DrawdownAnalysisService {
  analyze(portfolio: Portfolio, currentEquity: number, historicalMaxDrawdownPercentage: number): DrawdownAnalysis {
    const currentDrawdownPercentage = portfolio.peakEquity <= 0 ? 0 : Math.max(0, ((portfolio.peakEquity - currentEquity) / portfolio.peakEquity) * 100);

    const verdict = currentDrawdownPercentage < 10 ? RiskVerdict.ACCEPTABLE : currentDrawdownPercentage < 20 ? RiskVerdict.ELEVATED : RiskVerdict.CRITICAL;

    const reason =
      verdict === RiskVerdict.ACCEPTABLE
        ? `Current drawdown of ${currentDrawdownPercentage.toFixed(1)}% from peak equity is within normal range.`
        : `Current drawdown of ${currentDrawdownPercentage.toFixed(1)}% from peak equity is elevated.`;

    return { portfolioId: portfolio.id, currentDrawdownPercentage, historicalMaxDrawdownPercentage, verdict, reason };
  }
}
