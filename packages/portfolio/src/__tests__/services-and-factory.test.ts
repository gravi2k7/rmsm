import { describe, expect, it } from "vitest";
import { PortfolioService } from "../services/portfolio.service";
import { PortfolioFactory } from "../factories/portfolio.factory";
import { Portfolio } from "../entities/portfolio";
import { Position } from "../entities/position";
import { SymbolCode } from "@rmsm/market";
import type { PortfolioRepository } from "../repositories/portfolio.repository";
import type { PortfolioCalculator } from "../interfaces/portfolio-calculator.interface";

function symbol() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function fakeRepo(portfolio: Portfolio | null): PortfolioRepository {
  const store = new Map<string, Portfolio>();
  if (portfolio) store.set(portfolio.id, portfolio);
  return {
    findById: async (id) => store.get(id) ?? null,
    save: async (p) => {
      store.set(p.id, p);
    },
    findTradesByPortfolio: async () => [],
    saveTrade: async () => undefined,
    findEquityHistory: async () => [],
    saveEquityPoint: async () => undefined,
  };
}

function fakeCalculator(price: number): PortfolioCalculator {
  return { getCurrentPrice: async () => price };
}

describe("PortfolioService.openPosition / closePosition", () => {
  it("opens a position when there is enough buying power", async () => {
    const portfolio = Portfolio.create("pf1", 10000);
    const service = new PortfolioService(fakeRepo(portfolio), fakeCalculator(1.1));
    const position = Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() });

    const result = await service.openPosition("pf1", position, 500);
    expect(result.ok).toBe(true);
    expect(portfolio.openPositions).toHaveLength(1);
  });

  it("rejects opening a position without enough buying power", async () => {
    const portfolio = Portfolio.create("pf1", 100);
    const service = new PortfolioService(fakeRepo(portfolio), fakeCalculator(1.1));
    const position = Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() });

    const result = await service.openPosition("pf1", position, 500);
    expect(result.ok).toBe(false);
  });

  it("closes a position at the current market price and creates a Trade", async () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.openPosition(Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() }), 500);

    const service = new PortfolioService(fakeRepo(portfolio), fakeCalculator(1.12));
    const result = await service.closePosition("pf1", "p1", 500);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.trade.realizedPnl).toBeCloseTo(20);
    }
  });

  it("returns UnknownPortfolioError for a missing portfolio", async () => {
    const service = new PortfolioService(fakeRepo(null), fakeCalculator(1.1));
    const result = await service.getById("missing");
    expect(result.ok).toBe(false);
  });
});

describe("PortfolioService.getCurrentEquity", () => {
  it("sums cash balance and unrealized P&L of every open position", async () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.openPosition(Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() }), 500);

    const service = new PortfolioService(fakeRepo(portfolio), fakeCalculator(1.12));
    const result = await service.getCurrentEquity("pf1");
    expect(result.ok && result.value).toBeCloseTo(10020); // 10000 cash + 20 unrealized
  });
});

describe("PortfolioFactory", () => {
  it("createPortfolio builds a valid Portfolio", () => {
    const result = PortfolioFactory.createPortfolio({ initialCashBalance: 5000 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.cashBalance).toBe(5000);
  });

  it("createPortfolio fails on a negative balance", () => {
    const result = PortfolioFactory.createPortfolio({ initialCashBalance: -100 });
    expect(result.ok).toBe(false);
  });

  it("createPosition builds a valid Position", () => {
    const result = PortfolioFactory.createPosition({ symbolCode: "eurusd", side: "LONG", quantityUnits: 100, entryPrice: 1.1 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.symbolCode.value).toBe("EURUSD");
  });

  it("createPosition fails on an invalid symbol code", () => {
    const result = PortfolioFactory.createPosition({ symbolCode: "!!!", side: "LONG", quantityUnits: 100, entryPrice: 1.1 });
    expect(result.ok).toBe(false);
  });
});
