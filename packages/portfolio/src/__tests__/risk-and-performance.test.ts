import { describe, expect, it } from "vitest";
import { PerformanceService } from "../services/performance.service";
import { RiskMonitorService } from "../services/risk-monitor.service";
import { Trade } from "../entities/trade";
import { Equity } from "../entities/equity";
import { Portfolio } from "../entities/portfolio";
import { Position } from "../entities/position";
import { SymbolCode } from "@rmsm/market";
import type { PortfolioCalculator } from "../interfaces/portfolio-calculator.interface";

function symbol() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function trade(realizedPnl: number) {
  return Trade.create(`t-${Math.random()}`, {
    symbolCode: symbol(),
    side: "LONG",
    quantityUnits: 100,
    entryPrice: 1.1,
    exitPrice: 1.1 + realizedPnl / 100,
    realizedPnl,
    openedAt: new Date("2026-01-01"),
    closedAt: new Date("2026-01-02"),
  });
}

function equityPoint(value: number, at: Date) {
  return Equity.record(`e-${Math.random()}`, { balance: value, unrealizedPnl: 0, recordedAt: at });
}

describe("PerformanceService", () => {
  const service = new PerformanceService();

  it("realizedPnl sums every trade's own P&L", () => {
    expect(service.realizedPnl([trade(100), trade(-40)])).toBeCloseTo(60);
  });

  it("winRate is 0 with no trades", () => {
    expect(service.winRate([])).toBe(0);
  });

  it("winRate computes the percentage of winning trades", () => {
    expect(service.winRate([trade(100), trade(-40), trade(50)])).toBeCloseTo((2 / 3) * 100);
  });

  it("profitFactor divides gross profit by gross loss", () => {
    expect(service.profitFactor([trade(100), trade(-50)])).toBeCloseTo(2);
  });

  it("profitFactor is Infinity when there are wins and no losses", () => {
    expect(service.profitFactor([trade(100)])).toBe(Infinity);
  });

  it("profitFactor is 0 with no trades at all", () => {
    expect(service.profitFactor([])).toBe(0);
  });

  it("sharpeRatio is 0 with fewer than 2 equity points", () => {
    expect(service.sharpeRatio([equityPoint(10000, new Date())])).toBe(0);
  });

  it("sharpeRatio is positive for a consistently rising equity curve", () => {
    const curve = [
      equityPoint(10000, new Date("2026-01-01")),
      equityPoint(10100, new Date("2026-01-02")),
      equityPoint(10200, new Date("2026-01-03")),
    ];
    expect(service.sharpeRatio(curve)).toBeGreaterThan(0);
  });

  it("maxDrawdown finds the worst peak-to-trough decline in the whole series", () => {
    const curve = [
      equityPoint(10000, new Date("2026-01-01")),
      equityPoint(11000, new Date("2026-01-02")), // new peak
      equityPoint(9000, new Date("2026-01-03")), // drawdown from 11000
      equityPoint(10500, new Date("2026-01-04")), // partial recovery
    ];
    // drawdown = (11000 - 9000) / 11000 * 100
    expect(service.maxDrawdown(curve)).toBeCloseTo(((11000 - 9000) / 11000) * 100);
  });

  it("computeMetrics aggregates every metric into one object", () => {
    const metrics = service.computeMetrics([trade(100)], [equityPoint(10000, new Date()), equityPoint(10100, new Date())]);
    expect(metrics.totalTrades).toBe(1);
    expect(metrics.realizedPnl).toBeCloseTo(100);
  });
});

function fakeCalculator(price: number): PortfolioCalculator {
  return { getCurrentPrice: async () => price };
}

describe("RiskMonitorService", () => {
  it("computeSymbolExposure sums open positions' own market value for that symbol", async () => {
    const portfolio = Portfolio.create("pf1", 10000);
    const position = Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() });
    portfolio.openPosition(position, 500);

    const service = new RiskMonitorService(fakeCalculator(1.1));
    const exposure = await service.computeSymbolExposure(portfolio, "EURUSD", 10000);
    expect(exposure.amount).toBeCloseTo(1100); // 1000 units * 1.1
    expect(exposure.percentage).toBeCloseTo(11);
  });

  it("computePortfolioExposure sums across every open position", async () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.openPosition(Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() }), 500);

    const service = new RiskMonitorService(fakeCalculator(1.1));
    const exposure = await service.computePortfolioExposure(portfolio, 10000);
    expect(exposure.amount).toBeCloseTo(1100);
  });

  it("checkExposureLimit flags exposure over the configured limit", async () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.openPosition(Position.open("p1", { symbolCode: symbol(), side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, openedAt: new Date() }), 500);

    const service = new RiskMonitorService(fakeCalculator(1.1));
    const exposure = await service.computePortfolioExposure(portfolio, 10000);
    expect(service.checkExposureLimit(exposure, 5).ok).toBe(false);
    expect(service.checkExposureLimit(exposure, 50).ok).toBe(true);
  });

  it("checkDrawdownLimit delegates to Portfolio.checkDrawdown", () => {
    const portfolio = Portfolio.create("pf1", 10000);
    portfolio.pullDomainEvents();
    const service = new RiskMonitorService(fakeCalculator(1.1));
    service.checkDrawdownLimit(portfolio, 8000, 10);
    expect(portfolio.pullDomainEvents()[0]?.kind).toBe("DrawdownLimit");
  });
});
