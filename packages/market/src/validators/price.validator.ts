import { ok, err, type Result } from "@rmsm/core";
import type { Price } from "../value-objects/price";
import { InvalidSpreadError } from "../errors/market.errors";

/**
 * Pure, standalone validation functions for cross-`Price` rules —
 * distinct from `Price.create()`'s own single-value validation, the same
 * separation `symbol.validator.ts` documents for `Symbol`.
 */

/** A bid/ask pair must not be crossed (`bid <= ask`) and must share the
 * same precision — the same two checks `Spread.fromBidAsk()` performs
 * internally, exposed here as a standalone check for callers that want
 * to validate a quote *before* committing to constructing a `Spread`
 * from it (e.g. rejecting a malformed upstream feed message early). */
export function validateBidAsk(bid: Price, ask: Price): Result<true, InvalidSpreadError> {
  if (bid.precision !== ask.precision) {
    return err(new InvalidSpreadError(`bid and ask must share the same precision (${bid.precision} vs ${ask.precision}).`));
  }
  if (bid.isGreaterThan(ask)) {
    return err(new InvalidSpreadError(`bid (${bid.amount}) exceeds ask (${ask.amount}) — crossed market.`));
  }
  return ok(true);
}
