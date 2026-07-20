import { describe, expect, it } from "vitest";
import { computePerformanceMetrics, computeCumulativePnl } from "../performance";
import type { Trade } from "../../types";

function trade(realizedPnl: number, closedAt: string): Trade {
  return {
    id: `t-${Math.random()}`,
    symbolCode: "EURUSD",
    side: "LONG",
    quantityUnits: 1000,
    entryPrice: 1.1,
    exitPrice: 1.1 + realizedPnl / 1000,
    realizedPnl,
    isWin: realizedPnl > 0,
    openedAt: "2026-01-01T00:00:00.000Z",
    closedAt,
  };
}

describe("computePerformanceMetrics", () => {
  it("returns all zeros with no trades", () => {
    expect(computePerformanceMetrics([])).toEqual({ totalTrades: 0, winRate: 0, profitFactor: 0, realizedPnl: 0 });
  });

  it("computes win rate as a percentage", () => {
    const trades = [trade(100, "2026-01-01"), trade(-50, "2026-01-02"), trade(30, "2026-01-03")];
    expect(computePerformanceMetrics(trades).winRate).toBeCloseTo((2 / 3) * 100);
  });

  it("computes profit factor as gross profit over gross loss", () => {
    const trades = [trade(100, "2026-01-01"), trade(-50, "2026-01-02")];
    expect(computePerformanceMetrics(trades).profitFactor).toBeCloseTo(2);
  });

  it("profit factor is Infinity with wins and no losses", () => {
    expect(computePerformanceMetrics([trade(100, "2026-01-01")]).profitFactor).toBe(Infinity);
  });

  it("sums realized P&L across every trade", () => {
    const trades = [trade(100, "2026-01-01"), trade(-40, "2026-01-02")];
    expect(computePerformanceMetrics(trades).realizedPnl).toBeCloseTo(60);
  });
});

describe("computeCumulativePnl", () => {
  it("returns a running total sorted by close date, regardless of input order", () => {
    const trades = [trade(50, "2026-01-03"), trade(100, "2026-01-01"), trade(-30, "2026-01-02")];
    const series = computeCumulativePnl(trades);
    expect(series.map((p) => p.cumulativePnl)).toEqual([100, 70, 120]);
  });

  it("returns an empty series for no trades", () => {
    expect(computeCumulativePnl([])).toEqual([]);
  });
});
