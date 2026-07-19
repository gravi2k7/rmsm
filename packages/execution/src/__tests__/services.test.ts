import { describe, expect, it, vi } from "vitest";
import { ExecutionValidatorService } from "../services/execution-validator.service";
import { OrderRoutingService } from "../services/order-routing.service";
import { ExecutionService } from "../services/execution.service";
import { Order } from "../entities/order";
import { Execution } from "../entities/execution";
import type { ExecutionPlan } from "../entities/execution-plan";
import { Fill } from "../entities/fill";
import { Quantity } from "../value-objects/quantity";
import { Price } from "../value-objects/price";
import { Commission } from "../value-objects/commission";
import { MarketSymbol, SymbolCode, CurrencyCode, TickSize, LotSize, Volume } from "@rmsm/market";
import type { ExecutionEngine } from "../interfaces/execution-engine.interface";
import type { Broker, BrokerOrderAck } from "../interfaces/broker.interface";
import type { ExecutionRepository } from "../repositories/execution.repository";

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

function buildMarketSymbol(minVol = 0.01, maxVol = 100) {
  const base = CurrencyCode.create("EUR");
  const quote = CurrencyCode.create("USD");
  const tickSize = TickSize.create(0.00001);
  const min = Volume.create(minVol);
  const max = Volume.create(maxVol);
  if (!base.ok || !quote.ok || !tickSize.ok || !min.ok || !max.ok) throw new Error("fixture failed");
  return MarketSymbol.create("sym-1", {
    code: symbol(),
    description: "x",
    baseCurrency: base.value,
    quoteCurrency: quote.value,
    tickSize: tickSize.value,
    pointValue: 10,
    lotSize: LotSize.standard(),
    contractSize: 100_000,
    minVolume: min.value,
    maxVolume: max.value,
    precision: 5,
    exchangeId: "ex-1",
    assetClass: "FOREX",
    instrumentType: "SPOT",
  });
}

describe("ExecutionValidatorService.validate", () => {
  const validator = new ExecutionValidatorService();

  it("passes for a valid market order within symbol bounds", () => {
    const order = Order.create("o1", { decisionId: "d1", symbolCode: symbol(), side: "BUY", type: "MARKET", quantity: quantity(1) });
    expect(validator.validate(order, buildMarketSymbol()).ok).toBe(true);
  });

  it("fails when quantity is outside symbol bounds", () => {
    const order = Order.create("o1", { decisionId: "d1", symbolCode: symbol(), side: "BUY", type: "MARKET", quantity: quantity(1000) });
    expect(validator.validate(order, buildMarketSymbol()).ok).toBe(false);
  });

  it("fails when the order's symbol does not match the given market symbol", () => {
    const other = SymbolCode.create("GBPUSD");
    expect(other.ok).toBe(true);
    if (other.ok) {
      const order = Order.create("o1", { decisionId: "d1", symbolCode: other.value, side: "BUY", type: "MARKET", quantity: quantity(1) });
      expect(validator.validate(order, buildMarketSymbol()).ok).toBe(false);
    }
  });
});

function fakeEngine(orders: Order[]): ExecutionEngine {
  return { realizePlan: async () => orders };
}
function fakeBroker(accept: boolean): Broker {
  const ack: BrokerOrderAck = accept ? { accepted: true, brokerOrderId: "b1" } : { accepted: false, rejectionReason: "insufficient margin" };
  return {
    submitOrder: async () => ack,
    cancelOrder: async () => true,
    getFills: async () => [],
  };
}

describe("OrderRoutingService.route", () => {
  it("submits and accepts every order the engine produces, when the broker accepts", async () => {
    const order = Order.create("o1", { decisionId: "d1", symbolCode: symbol(), side: "BUY", type: "MARKET", quantity: quantity(1) });
    const service = new OrderRoutingService(fakeEngine([order]), fakeBroker(true));
    const result = await service.route({ id: "plan-1" } as ExecutionPlan);
    expect(result.ok).toBe(true);
    expect(order.status).toBe("ACCEPTED");
  });

  it("rejects orders the broker refuses, without failing the whole route call", async () => {
    const order = Order.create("o1", { decisionId: "d1", symbolCode: symbol(), side: "BUY", type: "MARKET", quantity: quantity(1) });
    const service = new OrderRoutingService(fakeEngine([order]), fakeBroker(false));
    const result = await service.route({ id: "plan-1" } as ExecutionPlan);
    expect(result.ok).toBe(true);
    expect(order.status).toBe("REJECTED");
  });

  it("fails when the engine returns no orders at all", async () => {
    const service = new OrderRoutingService(fakeEngine([]), fakeBroker(true));
    const result = await service.route({ id: "plan-1" } as ExecutionPlan);
    expect(result.ok).toBe(false);
  });
});

function buildFill(orderId: string, units: number) {
  const currency = CurrencyCode.create("USD");
  if (!currency.ok) throw new Error("fixture failed");
  return Fill.create(`fill-${Math.random()}`, { orderId, price: price(1.1), quantity: quantity(units), commission: Commission.zero(currency.value), filledAt: new Date() });
}

function fakeRepo(order: Order, execution: Execution): ExecutionRepository {
  return {
    findOrderById: async () => order,
    findOrdersByStatus: async () => [],
    findOrdersByDecisionId: async () => [],
    saveOrder: async () => undefined,
    findExecutionById: async () => execution,
    findExecutionByOrderId: async () => execution,
    saveExecution: async () => undefined,
    findSessionById: async () => null,
    saveSession: async () => undefined,
  };
}

describe("ExecutionService.pollAndApplyFills", () => {
  it("applies new fills and completes the execution once the order is FILLED", async () => {
    const order = Order.create("o1", { decisionId: "d1", symbolCode: symbol(), side: "BUY", type: "MARKET", quantity: quantity(100) });
    order.submit();
    order.accept();
    const execution = Execution.start("e1", "o1", 3);

    const broker: Broker = { submitOrder: async () => ({ accepted: true }), cancelOrder: async () => true, getFills: async () => [buildFill("o1", 100)] };
    const service = new ExecutionService(fakeRepo(order, execution), broker);

    const result = await service.pollAndApplyFills("e1");
    expect(result.ok).toBe(true);
    expect(order.status).toBe("FILLED");
    expect(execution.status).toBe("COMPLETED");
  });

  it("fails the execution when the order reaches a terminal non-fill status", async () => {
    const order = Order.create("o1", { decisionId: "d1", symbolCode: symbol(), side: "BUY", type: "MARKET", quantity: quantity(100) });
    order.submit();
    order.cancel();
    const execution = Execution.start("e1", "o1", 3);

    const broker: Broker = { submitOrder: async () => ({ accepted: true }), cancelOrder: async () => true, getFills: async () => [] };
    const service = new ExecutionService(fakeRepo(order, execution), broker);

    await service.pollAndApplyFills("e1");
    expect(execution.status).toBe("FAILED");
  });
});

describe("ExecutionService.cancel", () => {
  it("cancels the order and fails the execution", async () => {
    const order = Order.create("o1", { decisionId: "d1", symbolCode: symbol(), side: "BUY", type: "MARKET", quantity: quantity(100) });
    order.submit();
    const execution = Execution.start("e1", "o1", 3);

    const cancelSpy = vi.fn().mockResolvedValue(true);
    const broker: Broker = { submitOrder: async () => ({ accepted: true }), cancelOrder: cancelSpy, getFills: async () => [] };
    const service = new ExecutionService(fakeRepo(order, execution), broker);

    const result = await service.cancel("e1");
    expect(result.ok).toBe(true);
    expect(order.status).toBe("CANCELLED");
    expect(execution.status).toBe("FAILED");
    expect(cancelSpy).toHaveBeenCalledWith("o1");
  });
});
