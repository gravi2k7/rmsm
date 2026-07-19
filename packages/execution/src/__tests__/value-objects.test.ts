import { describe, expect, it } from "vitest";
import { OrderId } from "../value-objects/order-id";
import { ExecutionId } from "../value-objects/execution-id";
import { Slippage } from "../value-objects/slippage";
import { Commission } from "../value-objects/commission";
import { Price, CurrencyCode } from "@rmsm/market";

function price(amount: number) {
  const r = Price.create(amount, 5);
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function usd() {
  const r = CurrencyCode.create("USD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

describe("OrderId / ExecutionId", () => {
  it("accepts a valid UUID", () => {
    expect(OrderId.create("123e4567-e89b-12d3-a456-426614174000").ok).toBe(true);
    expect(ExecutionId.create("123e4567-e89b-12d3-a456-426614174000").ok).toBe(true);
  });
  it("rejects a non-UUID string", () => {
    expect(OrderId.create("not-a-uuid").ok).toBe(false);
    expect(ExecutionId.create("not-a-uuid").ok).toBe(false);
  });
});

describe("Slippage.forBuy", () => {
  it("is UNFAVORABLE when filled above the expected price", () => {
    const slippage = Slippage.forBuy(price(1.1), price(1.1005));
    expect(slippage.direction).toBe("UNFAVORABLE");
    expect(slippage.amount).toBeCloseTo(0.0005);
  });
  it("is FAVORABLE when filled below the expected price", () => {
    const slippage = Slippage.forBuy(price(1.1), price(1.0995));
    expect(slippage.direction).toBe("FAVORABLE");
  });
  it("is NONE when filled exactly at the expected price", () => {
    const slippage = Slippage.forBuy(price(1.1), price(1.1));
    expect(slippage.isZero()).toBe(true);
  });
});

describe("Slippage.forSell", () => {
  it("is UNFAVORABLE when filled below the expected price", () => {
    const slippage = Slippage.forSell(price(1.1), price(1.0995));
    expect(slippage.direction).toBe("UNFAVORABLE");
  });
  it("is FAVORABLE when filled above the expected price", () => {
    const slippage = Slippage.forSell(price(1.1), price(1.1005));
    expect(slippage.direction).toBe("FAVORABLE");
  });
});

describe("Commission", () => {
  it("accepts a non-negative amount", () => {
    expect(Commission.create(1.5, usd()).ok).toBe(true);
    expect(Commission.create(0, usd()).ok).toBe(true);
  });
  it("rejects a negative amount", () => {
    expect(Commission.create(-1, usd()).ok).toBe(false);
  });
  it("zero() produces a zero commission", () => {
    expect(Commission.zero(usd()).amount).toBe(0);
  });
  it("add() sums two commissions in the same currency", () => {
    const a = Commission.create(1, usd());
    const b = Commission.create(2, usd());
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      const sum = a.value.add(b.value);
      expect(sum.ok && sum.value.amount).toBe(3);
    }
  });
});
