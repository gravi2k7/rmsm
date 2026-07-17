import type { Rule } from "./rule.entity";
import type { LogicalOperator } from "../value-objects/comparison-operator.enum";

/**
 * A composite node — combines child `Rule`s and/or nested `RuleGroup`s
 * under one `LogicalOperator` (AND/OR/NOT), the standard recursive
 * composite pattern that lets a strategy author build arbitrarily
 * nested logic ("(RSI oversold AND volume spike) OR (price breaks
 * resistance)") without this domain model needing a different type for
 * every nesting depth. `NOT` is modeled as a real logical operator here
 * (not a per-child boolean flag) — applying NOT to a GROUP (negating
 * the group's own combined result) is a different, equally valid
 * operation from negating one child individually, and this shape
 * supports both: negate one condition by wrapping it in a
 * single-child NOT group, or negate a whole subtree by wrapping that
 * subtree.
 *
 * A `StrategyVersion` aggregate (below) holds exactly one root
 * `RuleGroup` — "the strategy's own entry logic" (and, in a real
 * implementation, likely a second root RuleGroup for exit logic,
 * exposed as a distinct field on `StrategyVersion` rather than forcing
 * entry/exit into one tree with an artificial top-level split; a real,
 * deliberate design choice for a future milestone to make explicit
 * when `StrategyVersion` itself is fleshed out further, not decided
 * here since this milestone's own `StrategyVersion` aggregate,
 * below, already names both fields explicitly).
 */
export class RuleGroup {
  constructor(
    public readonly id: string,
    public readonly operator: LogicalOperator,
    public readonly children: (Rule | RuleGroup)[],
  ) {}
}
