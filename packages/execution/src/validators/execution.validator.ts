import { ok, err, type Result } from "@rmsm/core";
import type { Order } from "../entities/order";
import { InvalidOrderError } from "../errors/execution.errors";

/** A `LIMIT`/`STOP_LIMIT` order must have a `limitPrice`; a
 * `STOP`/`STOP_LIMIT` order must have a `stopPrice` — the same rule
 * `Order.create()` itself enforces (throwing) at construction, exposed
 * here as a standalone, non-throwing check for callers that want to
 * validate a not-yet-constructed order's raw inputs before committing to
 * building one. */
export function validateOrderPriceRequirements(
  type: Order["type"],
  limitPrice: unknown,
  stopPrice: unknown,
): Result<true, InvalidOrderError> {
  if ((type === "LIMIT" || type === "STOP_LIMIT") && limitPrice === undefined) {
    return err(new InvalidOrderError(`${type} orders require a limitPrice.`));
  }
  if ((type === "STOP" || type === "STOP_LIMIT") && stopPrice === undefined) {
    return err(new InvalidOrderError(`${type} orders require a stopPrice.`));
  }
  return ok(true);
}

/** A quantity must fall within a caller-supplied allowed range — e.g. a
 * symbol's own min/max tradable volume (from `@rmsm/market`'s own
 * `MarketSymbol`), kept generic here rather than importing that type
 * directly so this validator stays usable for any min/max check, not
 * only symbol-bounds ones. */
export function validateQuantityWithinBounds(quantityUnits: number, min: number, max: number): Result<true, InvalidOrderError> {
  if (quantityUnits < min || quantityUnits > max) {
    return err(new InvalidOrderError(`quantity ${quantityUnits} is outside the allowed range [${min}, ${max}].`));
  }
  return ok(true);
}
