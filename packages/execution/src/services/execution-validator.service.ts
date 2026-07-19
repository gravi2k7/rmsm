import { ok, err, type Result } from "@rmsm/core";
import type { MarketSymbol } from "@rmsm/market";
import type { Order } from "../entities/order";
import { validateOrderPriceRequirements, validateQuantityWithinBounds } from "../validators/execution.validator";
import { InvalidOrderError } from "../errors/execution.errors";

/**
 * Aggregates every applicable order-level validation into one call,
 * returning every failure reason at once (the same "don't stop at the
 * first problem" pattern `@rmsm/strategy`'s own `StrategyValidatorService`
 * uses) rather than requiring a caller to sequence several validator
 * calls itself.
 */
export class ExecutionValidatorService {
  validate(order: Order, symbol: MarketSymbol): Result<true, InvalidOrderError> {
    const reasons: string[] = [];

    const priceCheck = validateOrderPriceRequirements(order.type, order.limitPrice, order.stopPrice);
    if (!priceCheck.ok) reasons.push(priceCheck.error.message);

    const boundsCheck = validateQuantityWithinBounds(order.quantity.units, symbol.minVolume.units, symbol.maxVolume.units);
    if (!boundsCheck.ok) reasons.push(boundsCheck.error.message);

    if (!order.symbolCode.equals(symbol.code)) {
      reasons.push(`order symbol (${order.symbolCode.value}) does not match the given market symbol (${symbol.code.value}).`);
    }

    if (reasons.length > 0) {
      return err(new InvalidOrderError(reasons.join("; ")));
    }
    return ok(true);
  }
}
