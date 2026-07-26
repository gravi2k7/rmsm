import type { Opportunity } from "@rmsm/opportunity";
import type { MultiTimeframeAnalysis } from "@rmsm/ai-market-intelligence";
import { TrendDirection } from "@rmsm/ai-market-intelligence";
import type { MultiTimeframeConfirmation } from "../../domain/entities/multi-timeframe-confirmation.entity";

const DIRECTION_TO_TREND: Readonly<Record<string, TrendDirection>> = { BUY: TrendDirection.UP, SELL: TrendDirection.DOWN };

/**
 * Cross-package AI-6xx reuse: checks a signal's own direction against a
 * REAL, unmodified `@rmsm/ai-market-intelligence` (AI-601)
 * `MultiTimeframeAnalysis` — never recomputes per-timeframe trend
 * alignment itself.
 */
export class MultiTimeframeConfirmationService {
  confirm(opportunity: Opportunity, analysis: MultiTimeframeAnalysis): MultiTimeframeConfirmation {
    const expectedTrend = DIRECTION_TO_TREND[opportunity.signal.direction];

    if (!analysis.aligned) {
      return { opportunityId: opportunity.id, confirmed: false, reason: "Higher timeframes are not aligned with each other." };
    }
    if (analysis.dominantDirection !== expectedTrend) {
      return {
        opportunityId: opportunity.id,
        confirmed: false,
        reason: `Signal direction ${opportunity.signal.direction} conflicts with the dominant multi-timeframe trend (${analysis.dominantDirection}).`,
      };
    }
    return { opportunityId: opportunity.id, confirmed: true, reason: `Multi-timeframe trend (${analysis.dominantDirection}) confirms the ${opportunity.signal.direction} signal.` };
  }
}
