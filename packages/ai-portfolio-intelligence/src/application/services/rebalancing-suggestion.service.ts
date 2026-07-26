import type { SymbolExposure } from "./allocation-analysis.service";
import type { RebalancingSuggestion } from "../../domain/entities/rebalancing-suggestion.entity";
import { RebalanceAction } from "../../domain/enums/portfolio-intelligence.enum";
import { EmptyExposureSetError } from "../../domain/errors/portfolio-intelligence-domain.errors";

const DRIFT_TOLERANCE_PERCENTAGE = 5;

/** Compares each symbol's REAL current `Exposure.percentage` against a
 * target weight (equal-weight across all symbols by default, or an
 * explicit target map) — pure comparison, no new weight computation. */
export class RebalancingSuggestionService {
  suggest(portfolioId: string, symbolExposures: readonly SymbolExposure[], targetWeights?: ReadonlyMap<string, number>): readonly RebalancingSuggestion[] {
    if (symbolExposures.length === 0) throw new EmptyExposureSetError();

    const equalWeight = 100 / symbolExposures.length;

    return symbolExposures.map((entry) => {
      const currentWeightPercentage = entry.exposure.percentage;
      const targetWeightPercentage = targetWeights?.get(entry.symbolCode) ?? equalWeight;
      const drift = currentWeightPercentage - targetWeightPercentage;

      const action = drift > DRIFT_TOLERANCE_PERCENTAGE ? RebalanceAction.DECREASE : drift < -DRIFT_TOLERANCE_PERCENTAGE ? RebalanceAction.INCREASE : RebalanceAction.HOLD;

      return { portfolioId, symbolCode: entry.symbolCode, action, currentWeightPercentage, targetWeightPercentage };
    });
  }
}
