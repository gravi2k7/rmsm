import type { Strategy } from "@rmsm/strategy";
import type { StrategyEvaluationService } from "./strategy-evaluation.service";
import type { StrategyRiskScoringService } from "./strategy-risk-scoring.service";
import type { StrategyComparison } from "../../domain/entities/strategy-comparison.entity";
import { InvalidComparisonSetError } from "../../domain/errors/strategy-intelligence-domain.errors";

/** Ranks a set of strategies purely from `StrategyEvaluationService` and
 * `StrategyRiskScoringService` output — never introduces its own scoring
 * logic, only aggregation and tie-breaking. */
export class StrategyComparisonService {
  constructor(
    private readonly evaluationService: StrategyEvaluationService,
    private readonly riskScoringService: StrategyRiskScoringService,
  ) {}

  compare(strategies: readonly Strategy[]): StrategyComparison {
    if (strategies.length < 2) throw new InvalidComparisonSetError(strategies.length);

    const entries = strategies.map((strategy) => {
      const evaluation = this.evaluationService.evaluate(strategy);
      const risk = this.riskScoringService.score(strategy);
      return { strategyId: strategy.id.value, name: strategy.name, completenessScore: evaluation.completenessScore, riskScore: risk.riskScore };
    });

    const winner = entries.reduce((best, entry) => {
      if (!best) return entry;
      if (entry.completenessScore > best.completenessScore) return entry;
      if (entry.completenessScore === best.completenessScore && entry.riskScore < best.riskScore) return entry;
      return best;
    }, entries[0]);

    return { entries, winnerStrategyId: winner?.strategyId ?? null };
  }
}
