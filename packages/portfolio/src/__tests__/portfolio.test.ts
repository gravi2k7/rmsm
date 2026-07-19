import { describe, expect, it } from "vitest";
import { Portfolio } from "../entities/portfolio";
import { Position } from "../entities/position";
import { SymbolCode } from "@rmsm/market";

function symbol() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function buildPosition(id = "p1") {
  return Position.open(id, { symbolCode: symbol(), side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() });
}

describe("Portfolio.create", () => {
  it("starts with the given cash balance and zero margin", () => {
    const portfolio = Portfolio.create("pf1", 10000);
    expect(portfolio.cashBalance).toBe(10000);
    expect(portfolio.marginUsed).toBe(0);
    expect(portfolio.buyingPower).toBe(10000);
  });

  it("raises PortfolioCreatedEvent", () => {
    expect(Portfolio.create("pf1", 10000).pullDomainEvents()[0]?.kind).toBe("PortfolioCreated");
  });

  it("rejects a negative initial balance", () => {
    expect(() => Portfolio.create("pf1", -100)).toThrow();
  });
});

describe("Portfolio.deposit / withdraw", () => {
  it("deposit() increases cashBalance and raises PortfolioUpdatedEvent", () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.pullDomainEvents();
    portfolio.deposit(500);
    expect(portfolio.cashBalance).toBe(10500);
    expect(portfolio.pullDomainEvents()[0]?.kind).toBe("PortfolioUpdated");
  });

  it("withdraw() decreases cashBalance", () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.withdraw(500);
    expect(portfolio.cashBalance).toBe(9500);
  });

  it("withdraw() rejects an amount exceeding buying power", () => {
    const portfolio = Portfolio.create("pf1", 1000);
    expect(() => portfolio.withdraw(2000)).toThrow();
  });

  it("every deposit/withdrawal is recorded in balanceHistory", () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.deposit(500);
    portfolio.withdraw(200);
    expect(portfolio.balanceHistory).toHaveLength(2);
  });
});

describe("Portfolio.openPosition / closePosition", () => {
  it("openPosition() adds the position, commits margin, and raises PositionOpenedEvent", () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.pullDomainEvents();
    portfolio.openPosition(buildPosition(), 500);
    expect(portfolio.openPositions).toHaveLength(1);
    expect(portfolio.marginUsed).toBe(500);
    expect(portfolio.buyingPower).toBe(9500);
    expect(portfolio.pullDomainEvents()[0]?.kind).toBe("PositionOpened");
  });

  it("openPosition() rejects when margin required exceeds buying power", () => {
    const portfolio = Portfolio.create("pf1", 100);
    expect(() => portfolio.openPosition(buildPosition(), 500)).toThrow();
  });

  it("closePosition() closes the position, releases margin, records realized P&L, raises PositionClosedEvent", () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.openPosition(buildPosition("p1"), 500);
    portfolio.pullDomainEvents();

    portfolio.closePosition("p1", 1.12, 500);

    expect(portfolio.marginUsed).toBe(0);
    expect(portfolio.cashBalance).toBeCloseTo(10020); // +20 realized P&L
    const events = portfolio.pullDomainEvents();
    expect(events[0]).toMatchObject({ kind: "PositionClosed", realizedPnl: expect.closeTo(20, 5) });
  });

  it("closePosition() throws UnknownPositionError for an unknown position id", () => {
    const portfolio = Portfolio.create("pf1", 10000);
    expect(() => portfolio.closePosition("missing", 1.1, 0)).toThrow();
  });
});

describe("Portfolio.checkDrawdown", () => {
  it("updates peakEquity on a new high without raising an event", () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.pullDomainEvents();
    portfolio.checkDrawdown(11000, 10);
    expect(portfolio.peakEquity).toBe(11000);
    expect(portfolio.pullDomainEvents()).toHaveLength(0);
  });

  it("raises DrawdownLimitEvent when the limit is exceeded", () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.pullDomainEvents();
    portfolio.checkDrawdown(8000, 10); // 20% drawdown vs 10% limit
    const events = portfolio.pullDomainEvents();
    expect(events[0]?.kind).toBe("DrawdownLimit");
  });

  it("does not raise the event when within the limit", () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.pullDomainEvents();
    portfolio.checkDrawdown(9500, 10); // 5% drawdown vs 10% limit
    expect(portfolio.pullDomainEvents()).toHaveLength(0);
  });
});
