import { ok, err, type Result } from "@rmsm/core";
import type { StrategyVersion } from "../entities/strategy-version";
import { InvalidRuleError } from "../errors/strategy.errors";

/** A version must declare at least one entry rule to ever be meaningful
 * — a strategy with no way to enter a position isn't a strategy. Exit
 * rules are not required at this layer (a stop-loss/take-profit-only
 * exit policy might be handled entirely by risk/execution layers outside
 * this domain), so only entry rules are checked here. */
export function validateHasEntryRule(version: StrategyVersion): Result<true, InvalidRuleError> {
  if (version.entryRules.length === 0) {
    return err(new InvalidRuleError("a strategy version must declare at least one entry rule."));
  }
  return ok(true);
}

/** Every rule's own `order` within a version must be unique — two rules
 * both claiming to be "first" is an ambiguous evaluation order a real
 * execution engine couldn't resolve deterministically. */
export function validateUniqueRuleOrder(version: StrategyVersion): Result<true, InvalidRuleError> {
  const orders = version.rules.map((r) => r.order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    return err(new InvalidRuleError("rule order values must be unique within a version."));
  }
  return ok(true);
}
