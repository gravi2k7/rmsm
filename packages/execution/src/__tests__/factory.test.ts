import { describe, expect, it } from "vitest";
import { ExecutionFactory, type RawOrderInput } from "../factories/execution.factory";

function validInput(): RawOrderInput {
  return {
    decisionId: "dec-1",
    symbolCode: "eurusd",
    side: "BUY",
    type: "MARKET",
    quantityUnits: 100,
    pricePrecision: 5,
  };
}

describe("ExecutionFactory.createOrder", () => {
  it("builds a valid MARKET order", () => {
    const result = ExecutionFactory.createOrder(validInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.symbolCode.value).toBe("EURUSD");
      expect(result.value.status).toBe("PENDING");
    }
  });

  it("builds a valid LIMIT order with a limitPrice", () => {
    const result = ExecutionFactory.createOrder({ ...validInput(), type: "LIMIT", limitPriceAmount: 1.1 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.limitPrice?.amount).toBe(1.1);
  });

  it("fails a LIMIT order without a limitPrice, as a Result rather than throwing", () => {
    expect(() => ExecutionFactory.createOrder({ ...validInput(), type: "LIMIT" })).not.toThrow();
    const result = ExecutionFactory.createOrder({ ...validInput(), type: "LIMIT" });
    expect(result.ok).toBe(false);
  });

  it("fails on an invalid symbol code", () => {
    const result = ExecutionFactory.createOrder({ ...validInput(), symbolCode: "!!!" });
    expect(result.ok).toBe(false);
  });

  it("fails on a negative quantity", () => {
    const result = ExecutionFactory.createOrder({ ...validInput(), quantityUnits: -1 });
    expect(result.ok).toBe(false);
  });

  it("uses the supplied id when given", () => {
    const result = ExecutionFactory.createOrder({ ...validInput(), id: "custom-id" });
    expect(result.ok && result.value.id).toBe("custom-id");
  });
});
