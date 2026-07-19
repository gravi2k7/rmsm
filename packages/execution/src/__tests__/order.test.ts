import { describe, expect, it } from "vitest";
import { Order } from "../entities/order";
import { Fill } from "../entities/fill";
import { Quantity } from "../value-objects/quantity";
import { Price } from "../value-objects/price";
import { Commission } from "../value-objects/commission";
import { SymbolCode, CurrencyCode } from "@rmsm/market";

function symbol() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function quantity(units: number) {
  const r = Quantity.create(units);
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function price(amount: number) {
  const r = Price.create(amount, 5);
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function commission(amount: number) {
  const currency = CurrencyCode.create("USD");
  if (!currency.ok) throw new Error("fixture failed");
  const r = Commission.create(amount, currency.value);
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function buildMarketOrder(units = 100) {
  return Order.create("order-1", { decisionId: "dec-1", symbolCode: symbol(), side: "BUY", type: "MARKET", quantity: quantity(units) });
}

function buildFill(orderId: string, units: number, fillPrice = 1.1) {
  return Fill.create(`fill-${Math.random()}`, { orderId, price: price(fillPrice), quantity: quantity(units), commission: commission(0.5), filledAt: new Date() });
}

describe("Order.create", () => {
  it("starts PENDING with no fills", () => {
    const order = buildMarketOrder();
    expect(order.status).toBe("PENDING");
    expect(order.fills).toHaveLength(0);
  });

  it("raises OrderCreatedEvent", () => {
    expect(buildMarketOrder().pullDomainEvents()[0]?.kind).toBe("OrderCreated");
  });

  it("requires a limitPrice for LIMIT orders", () => {
    expect(() => Order.create("o1", { decisionId: "d1", symbolCode: symbol(), side: "BUY", type: "LIMIT", quantity: quantity(100) })).toThrow();
  });

  it("requires a stopPrice for STOP orders", () => {
    expect(() => Order.create("o1", { decisionId: "d1", symbolCode: symbol(), side: "BUY", type: "STOP", quantity: quantity(100) })).toThrow();
  });

  it("requires both limitPrice and stopPrice for STOP_LIMIT orders", () => {
    expect(() =>
      Order.create("o1", { decisionId: "d1", symbolCode: symbol(), side: "BUY", type: "STOP_LIMIT", quantity: quantity(100), limitPrice: price(1.1) }),
    ).toThrow();
  });

  it("accepts a well-formed LIMIT order", () => {
    const order = Order.create("o1", { decisionId: "d1", symbolCode: symbol(), side: "BUY", type: "LIMIT", quantity: quantity(100), limitPrice: price(1.1) });
    expect(order.limitPrice?.amount).toBe(1.1);
  });
});

describe("Order lifecycle transitions", () => {
  it("submit() -> ACCEPTED path raises the right events", () => {
    const order = buildMarketOrder();
    order.pullDomainEvents();
    order.submit();
    expect(order.status).toBe("SUBMITTED");
    expect(order.pullDomainEvents()[0]?.kind).toBe("OrderSubmitted");
    order.accept();
    expect(order.status).toBe("ACCEPTED");
  });

  it("rejects submitting an already-submitted order", () => {
    const order = buildMarketOrder();
    order.submit();
    expect(() => order.submit()).toThrow();
  });

  it("cancel() raises OrderCancelledEvent", () => {
    const order = buildMarketOrder();
    order.submit();
    order.pullDomainEvents();
    order.cancel();
    expect(order.status).toBe("CANCELLED");
    expect(order.pullDomainEvents()[0]?.kind).toBe("OrderCancelled");
  });

  it("reject() and expire() transition without a dedicated event", () => {
    const rejected = buildMarketOrder();
    rejected.submit();
    rejected.pullDomainEvents();
    rejected.reject();
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.pullDomainEvents()).toHaveLength(0);

    const expired = buildMarketOrder();
    expired.submit();
    expired.expire();
    expect(expired.status).toBe("EXPIRED");
  });

  it("rejects any transition once FILLED (terminal)", () => {
    const order = buildMarketOrder(100);
    order.submit();
    order.accept();
    order.applyFill(buildFill(order.id, 100));
    expect(order.status).toBe("FILLED");
    expect(() => order.cancel()).toThrow();
  });
});

describe("Order.applyFill", () => {
  it("transitions to PARTIALLY_FILLED when the fill doesn't complete the order", () => {
    const order = buildMarketOrder(100);
    order.submit();
    order.accept();
    order.pullDomainEvents();
    order.applyFill(buildFill(order.id, 40));
    expect(order.status).toBe("PARTIALLY_FILLED");
    expect(order.pullDomainEvents()[0]?.kind).toBe("OrderPartiallyFilled");
  });

  it("transitions to FILLED when fills reach the full quantity", () => {
    const order = buildMarketOrder(100);
    order.submit();
    order.accept();
    order.applyFill(buildFill(order.id, 40));
    order.pullDomainEvents();
    order.applyFill(buildFill(order.id, 60));
    expect(order.status).toBe("FILLED");
    expect(order.pullDomainEvents()[0]?.kind).toBe("OrderFilled");
  });

  it("rejects a fill that would overfill the order", () => {
    const order = buildMarketOrder(100);
    order.submit();
    order.accept();
    expect(() => order.applyFill(buildFill(order.id, 150))).toThrow();
  });

  it("computes filledQuantityUnits as the sum of all fills", () => {
    const order = buildMarketOrder(100);
    order.submit();
    order.accept();
    order.applyFill(buildFill(order.id, 40));
    order.applyFill(buildFill(order.id, 30));
    expect(order.filledQuantityUnits).toBe(70);
  });

  it("computes averageFillPrice as the quantity-weighted average", () => {
    const order = buildMarketOrder(100);
    order.submit();
    order.accept();
    order.applyFill(buildFill(order.id, 60, 1.1));
    order.applyFill(buildFill(order.id, 40, 1.2));
    // weighted: (60*1.1 + 40*1.2) / 100 = (66 + 48) / 100 = 1.14
    expect(order.averageFillPrice).toBeCloseTo(1.14);
  });

  it("averageFillPrice is undefined with no fills", () => {
    expect(buildMarketOrder().averageFillPrice).toBeUndefined();
  });
});
