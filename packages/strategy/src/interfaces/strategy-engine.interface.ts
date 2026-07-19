import type { Strategy } from "../entities/strategy";
import type { StrategyRule } from "../entities/strategy-rule";

/**
 * The port to an actual execution/evaluation engine — implemented
 * entirely outside this package. This domain declares *what* a strategy
 * is (rules, parameters, lifecycle) but never evaluates a rule's
 * `expression` against live market data itself; that's real execution
 * infrastructure this package deliberately has no dependency on.
 */
export interface StrategyEngine {
  /** Evaluates a single rule's own expression against current market
   * conditions, returning whether it currently holds. What "current
   * market conditions" even means (an indicator snapshot, a price feed,
   * etc.) is entirely up to the real engine implementing this — this
   * domain doesn't model that input shape. */
  evaluateRule(rule: StrategyRule): Promise<boolean>;

  /** Whether `strategy`'s own current version's entry rules are
   * currently satisfied — i.e. whether it would generate a signal right
   * now if asked to. */
  isEntrySignalActive(strategy: Strategy): Promise<boolean>;
}
