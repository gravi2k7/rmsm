import { ok, err, type Result, InvariantViolationError } from "@rmsm/core";
import { randomUUID } from "node:crypto";
import { SymbolCode, Price } from "@rmsm/market";
import { Order, type OrderSide, type OrderType } from "../entities/order";
import { Quantity } from "../value-objects/quantity";
import { InvalidOrderError, type ExecutionDomainError } from "../errors/execution.errors";

export interface RawOrderInput {
  readonly id?: string;
  readonly decisionId: string;
  readonly symbolCode: string;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly quantityUnits: number;
  readonly limitPriceAmount?: number;
  readonly stopPriceAmount?: number;
  readonly pricePrecision: number;
}

/** Builds an `Order` from raw primitive input — the same fail-fast,
 * aggregated-`Result` composition pattern every other domain package's
 * own factory in this platform uses. */
export class ExecutionFactory {
  static createOrder(input: RawOrderInput): Result<Order, ExecutionDomainError> {
    const symbolCode = SymbolCode.create(input.symbolCode);
    if (!symbolCode.ok) return symbolCode;

    const quantity = Quantity.create(input.quantityUnits);
    if (!quantity.ok) return quantity;

    let limitPrice: Price | undefined;
    if (input.limitPriceAmount !== undefined) {
      const limitPriceResult = Price.create(input.limitPriceAmount, input.pricePrecision);
      if (!limitPriceResult.ok) return limitPriceResult;
      limitPrice = limitPriceResult.value;
    }

    let stopPrice: Price | undefined;
    if (input.stopPriceAmount !== undefined) {
      const stopPriceResult = Price.create(input.stopPriceAmount, input.pricePrecision);
      if (!stopPriceResult.ok) return stopPriceResult;
      stopPrice = stopPriceResult.value;
    }

    try {
      const order = Order.create(input.id ?? randomUUID(), {
        decisionId: input.decisionId,
        symbolCode: symbolCode.value,
        side: input.side,
        type: input.type,
        quantity: quantity.value,
        limitPrice,
        stopPrice,
      });
      return ok(order);
    } catch (error) {
      if (error instanceof InvalidOrderError) return err(error);
      if (error instanceof InvariantViolationError) return err(new InvalidOrderError(error.message));
      throw error;
    }
  }
}
