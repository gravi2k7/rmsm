import type { StrategyVerdict } from "../enums/strategy-intelligence.enum";

/** Structural readiness assessment of a `Strategy` — never re-evaluates
 * rule expressions (that's `StrategyEngine`'s job); this only looks at
 * what the strategy itself already declares: version presence, rule
 * counts, lifecycle status. */
export interface StrategyEvaluation {
  readonly strategyId: string;
  readonly verdict: StrategyVerdict;
  /** 0..1 — fraction of readiness checks passed. */
  readonly completenessScore: number;
  readonly reasons: readonly string[];
}
