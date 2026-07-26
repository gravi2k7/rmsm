import type { Exposure } from "@rmsm/portfolio";
import type { ExposureAnalysisResult } from "../../domain/entities/exposure-analysis-result.entity";

/** Reads a REAL `Exposure` (from `RiskMonitorService`) against a limit —
 * uses `Exposure.exceeds()` directly, never recomputes the percentage. */
export class ExposureAnalysisService {
  analyze(portfolioId: string, exposure: Exposure, limitPercentage: number): ExposureAnalysisResult {
    return {
      portfolioId,
      scope: exposure.scope,
      scopeId: exposure.scopeId,
      percentage: exposure.percentage,
      limitPercentage,
      withinLimit: !exposure.exceeds(limitPercentage),
    };
  }
}
