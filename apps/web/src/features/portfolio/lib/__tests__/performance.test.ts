import { describe, expect, it, vi, afterEach } from "vitest";
import { computePerformanceMetrics, computeTodaysRealizedPnl, computeCumulativePnl, computeUnrealizedPnl } from "../performance";
import type { Trade, Position } from "../../types";

function trade(overrides: Partial<Trade>): Trade {
  return {
    id: "t1",
    symbolCode: "EURUSD",
    side: "LONG",
    quantityUnits: 1000,
    entryPrice: 1.1,
    exitPrice: 1.11,
    realizedPnl: 10,
    isWin: true,
    openedAt: "2026-07-19T10:00:00.000Z",
    closedAt: "2026-07-19T12:00:00.000Z",
    ...overrides,
  };
}

function position(overrides: Partial<Position>): Position {
  return {
    id: "p1",
    symbolCode: "EURUSD",
    side: "LONG",
    status: "OPEN",
    quantityUnits: 1000,
    averageEntryPrice: 1.1,
    openedAt: "2026-07-19T10:00:00.000Z",
    ...overrides,
  };
}

describe("computePerformanceMetrics", () => {
  it("returns zeroed metrics for no trades", () => {
    expect(computePerformanceMetrics([])).toEqual({ totalTrades: 0, winRate: 0, profitFactor: 0, realizedPnl: 0 });
  });

  it("computes win rate, profit factor, and total realized P&L across wins and losses", () => {
    const trades = [trade({ id: "1", realizedPnl: 100, isWin: true }), trade({ id: "2", realizedPnl: -50, isWin: false })];
    const result = computePerformanceMetrics(trades);
    expect(result.totalTrades).toBe(2);
    expect(result.winRate).toBe(50);
    expect(result.profitFactor).toBe(2);
    expect(result.realizedPnl).toBe(50);
  });

  it("profitFactor is Infinity when there are wins and no losses", () => {
    const result = computePerformanceMetrics([trade({ realizedPnl: 100, isWin: true })]);
    expect(result.profitFactor).toBe(Infinity);
  });
});

describe("computeTodaysRealizedPnl", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sums realizedPnl only for trades closed today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T18:00:00.000Z"));

    const trades = [
      trade({ id: "1", realizedPnl: 100, closedAt: "2026-07-19T09:00:00.000Z" }),
      trade({ id: "2", realizedPnl: -20, closedAt: "2026-07-18T09:00:00.000Z" }),
    ];

    expect(computeTodaysRealizedPnl(trades)).toBe(100);
  });
});

describe("computeCumulativePnl", () => {
  it("returns a running total sorted by close date", () => {
    const trades = [
      trade({ id: "2", realizedPnl: 20, closedAt: "2026-07-19T12:00:00.000Z" }),
      trade({ id: "1", realizedPnl: 10, closedAt: "2026-07-18T12:00:00.000Z" }),
    ];
    const series = computeCumulativePnl(trades);
    expect(series.map((p) => p.cumulativePnl)).toEqual([10, 30]);
  });
});

describe("computeUnrealizedPnl", () => {
  it("computes P&L for LONG positions as (currentPrice - entryPrice) * quantity", () => {
    const positions = [position({ side: "LONG", averageEntryPrice: 1.1, quantityUnits: 1000 })];
    const result = computeUnrealizedPnl(positions, () => 1.11);
    expect(result.total).toBeCloseTo(10, 5);
    expect(result.resolvedCount).toBe(1);
    expect(result.unresolvedCount).toBe(0);
  });

  it("computes P&L for SHORT positions as (entryPrice - currentPrice) * quantity", () => {
    const positions = [position({ side: "SHORT", averageEntryPrice: 1.1, quantityUnits: 1000 })];
    const result = computeUnrealizedPnl(positions, () => 1.09);
    expect(result.total).toBeCloseTo(10, 5);
  });

  it("excludes CLOSED positions", () => {
    const positions = [position({ status: "CLOSED" })];
    const result = computeUnrealizedPnl(positions, () => 1.2);
    expect(result.resolvedCount).toBe(0);
    expect(result.unresolvedCount).toBe(0);
  });

  it("counts positions whose price can't be resolved separately, rather than treating them as zero", () => {
    const positions = [position({ id: "p1", symbolCode: "EURUSD" }), position({ id: "p2", symbolCode: "UNKNOWN" })];
    const result = computeUnrealizedPnl(positions, (symbolCode) => (symbolCode === "EURUSD" ? 1.15 : null));
    expect(result.resolvedCount).toBe(1);
    expect(result.unresolvedCount).toBe(1);
  });
});
