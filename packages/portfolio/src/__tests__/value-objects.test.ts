import { describe, expect, it } from "vitest";
import { PortfolioId } from "../value-objects/portfolio-id";
import { PnL } from "../value-objects/pnl";
import { Drawdown } from "../value-objects/drawdown";
import { Exposure } from "../value-objects/exposure";
import { CurrencyCode } from "@rmsm/market";

function usd() {
  const r = CurrencyCode.create("USD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

describe("PortfolioId", () => {
  it("accepts a valid UUID", () => {
    expect(PortfolioId.create("123e4567-e89b-12d3-a456-426614174000").ok).toBe(true);
  });
  it("rejects a non-UUID string", () => {
    expect(PortfolioId.create("not-a-uuid").ok).toBe(false);
  });
});

describe("PnL", () => {
  it("realized()/unrealized() tag the kind correctly", () => {
    expect(PnL.realized(100, usd()).kind).toBe("REALIZED");
    expect(PnL.unrealized(-50, usd()).kind).toBe("UNREALIZED");
  });
  it("isProfit()/isLoss() reflect the sign", () => {
    expect(PnL.realized(100, usd()).isProfit()).toBe(true);
    expect(PnL.realized(-100, usd()).isLoss()).toBe(true);
    expect(PnL.realized(0, usd()).isProfit()).toBe(false);
  });
});

describe("Drawdown", () => {
  it("computes zero drawdown at or above peak", () => {
    const result = Drawdown.create(10000, 10500);
    expect(result.ok && result.value.amount).toBe(0);
    expect(result.ok && result.value.percentage).toBe(0);
  });
  it("computes the correct amount/percentage below peak", () => {
    const result = Drawdown.create(10000, 9000);
    expect(result.ok && result.value.amount).toBe(1000);
    expect(result.ok && result.value.percentage).toBeCloseTo(10);
  });
  it("exceeds() compares against a limit", () => {
    const result = Drawdown.create(10000, 9000);
    expect(result.ok && result.value.exceeds(5)).toBe(true);
    expect(result.ok && result.value.exceeds(20)).toBe(false);
  });
  it("rejects a non-positive peakEquity", () => {
    expect(Drawdown.create(0, 100).ok).toBe(false);
  });
});

describe("Exposure", () => {
  it("computes percentage of portfolio equity", () => {
    const result = Exposure.create({ scope: "SYMBOL", scopeId: "EURUSD", amount: 2000, portfolioEquity: 10000 });
    expect(result.ok && result.value.percentage).toBeCloseTo(20);
  });
  it("requires a scopeId for SYMBOL/SECTOR scopes", () => {
    expect(Exposure.create({ scope: "SYMBOL", amount: 100, portfolioEquity: 1000 }).ok).toBe(false);
  });
  it("does not require a scopeId for PORTFOLIO scope", () => {
    expect(Exposure.create({ scope: "PORTFOLIO", amount: 100, portfolioEquity: 1000 }).ok).toBe(true);
  });
  it("exceeds() compares against a limit", () => {
    const result = Exposure.create({ scope: "PORTFOLIO", amount: 3000, portfolioEquity: 10000 });
    expect(result.ok && result.value.exceeds(20)).toBe(true);
    expect(result.ok && result.value.exceeds(50)).toBe(false);
  });
});
