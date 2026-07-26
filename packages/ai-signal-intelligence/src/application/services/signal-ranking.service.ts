import type { Opportunity } from "@rmsm/opportunity";
import { ScoringService } from "@rmsm/opportunity";
import type { SignalRanking } from "../../domain/entities/signal-ranking.entity";
import { EmptySignalSetError } from "../../domain/errors/signal-intelligence-domain.errors";

/** Ranks opportunities purely by the REAL `ScoringService` composite
 * score — sorting and aggregation only, no new scoring logic. */
export class SignalRankingService {
  constructor(private readonly scoringService: ScoringService = new ScoringService()) {}

  rank(opportunities: readonly Opportunity[]): SignalRanking {
    if (opportunities.length === 0) throw new EmptySignalSetError();

    const entries = opportunities
      .map((opportunity) => ({
        opportunityId: opportunity.id,
        symbolCode: opportunity.symbolCode.value,
        direction: opportunity.signal.direction,
        compositeScore: this.scoringService.score(opportunity.confidence, opportunity.signal.strength, opportunity.marketContext).value,
      }))
      .sort((a, b) => b.compositeScore - a.compositeScore);

    return { entries, rankedOpportunityIds: entries.map((e) => e.opportunityId) };
  }
}
