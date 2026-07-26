import type { SymbolExposure } from "./allocation-analysis.service";
import type { DiversificationAnalysis } from "../../domain/entities/diversification-analysis.entity";
import { DiversificationLevel } from "../../domain/enums/portfolio-intelligence.enum";
import { EmptyExposureSetError } from "../../domain/errors/portfolio-intelligence-domain.errors";

/** Computes a Herfindahl-Hirschman Index over REAL per-symbol
 * `Exposure.percentage` values — a standard concentration measure, not
 * a re-derivation of exposure itself. */
export class DiversificationAnalysisService {
  analyze(portfolioId: string, symbolExposures: readonly SymbolExposure[]): DiversificationAnalysis {
    if (symbolExposures.length === 0) throw new EmptyExposureSetError();

    const herfindahlIndex = symbolExposures.reduce((sum, entry) => sum + (entry.exposure.percentage / 100) ** 2, 0);

    const level =
      herfindahlIndex < 0.15 ? DiversificationLevel.WELL_DIVERSIFIED : herfindahlIndex < 0.35 ? DiversificationLevel.MODERATE : DiversificationLevel.CONCENTRATED;

    const reason =
      level === DiversificationLevel.WELL_DIVERSIFIED
        ? "Exposure is spread broadly across symbols."
        : level === DiversificationLevel.MODERATE
          ? "Exposure shows moderate concentration in a subset of symbols."
          : "Exposure is heavily concentrated in one or a few symbols.";

    return { portfolioId, level, herfindahlIndex, reason };
  }
}
