import type { Opportunity } from "@rmsm/opportunity";
import { ScoringService } from "@rmsm/opportunity";
import type { SignalFilterResult } from "../../domain/entities/signal-filter-result.entity";

export interface SignalFilterOptions {
  readonly minCompositeScore?: number;
  readonly requireFavorableContext?: boolean;
  readonly excludeExpired?: boolean;
  readonly asOf?: Date;
}

/** Filters opportunities by composite score / context favorability /
 * expiry — reads `ScoringService` and `Opportunity.isPastExpiry()`
 * directly, no separate criteria computed here. */
export class SignalFilterService {
  constructor(private readonly scoringService: ScoringService = new ScoringService()) {}

  filter(opportunities: readonly Opportunity[], options: SignalFilterOptions = {}): SignalFilterResult {
    const includedOpportunityIds: string[] = [];
    const excluded: { opportunityId: string; reason: string }[] = [];
    const asOf = options.asOf ?? new Date();

    for (const opportunity of opportunities) {
      if (options.excludeExpired && opportunity.isPastExpiry(asOf)) {
        excluded.push({ opportunityId: opportunity.id, reason: "Opportunity is past its expiry." });
        continue;
      }
      if (options.requireFavorableContext && !opportunity.marketContext.isFavorable()) {
        excluded.push({ opportunityId: opportunity.id, reason: "Market context is unfavorable." });
        continue;
      }
      const score = this.scoringService.score(opportunity.confidence, opportunity.signal.strength, opportunity.marketContext).value;
      if (options.minCompositeScore !== undefined && score < options.minCompositeScore) {
        excluded.push({ opportunityId: opportunity.id, reason: `Composite score ${score.toFixed(0)} is below minimum ${options.minCompositeScore}.` });
        continue;
      }
      includedOpportunityIds.push(opportunity.id);
    }

    return { includedOpportunityIds, excluded };
  }
}
