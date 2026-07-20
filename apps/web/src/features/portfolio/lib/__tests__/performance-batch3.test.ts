import { describe, expect, it, vi, afterEach } from "vitest";
import {
  computeWeeklyRealizedPnl,
  computeMonthlyRealizedPnl,
  computeDrawdown,
  computeWinLossAverages,
  computePerformanceByInstrument,
  computePerformanceByHoldingDuration,
  computeDailyPnlCalendar,
} from "../performance";
import type { Trade } from "../../types";

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

describe("computeWeeklyRealizedPnl / computeMonthlyRealizedPnl", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");

  afterEach(() => vi.useRealTimers());

  it("includes trades within the last 7 days, excludes older ones", () => {
    const trades = [
      trade({ id: "1", realizedPnl: 100, closedAt: "2026-07-18T00:00:00.000Z" }),
      trade({ id: "2", realizedPnl: 50, closedAt: "2026-06-01T00:00:00.000Z" }),
    ];
    expect(computeWeeklyRealizedPnl(trades, now)).toBe(100);
  });

  it("includes trades within the last 30 days, excludes older ones", () => {
    const trades = [
      trade({ id: "1", realizedPnl: 100, closedAt: "2026-07-01T00:00:00.000Z" }),
      trade({ id: "2", realizedPnl: 50, closedAt: "2026-01-01T00:00:00.000Z" }),
    ];
    expect(computeMonthlyRealizedPnl(trades, now)).toBe(100);
  });
});

describe("computeDrawdown", () => {
  it("returns zero drawdown for a monotonically increasing P&L series", () => {
    const trades = [
      trade({ id: "1", realizedPnl: 10, closedAt: "2026-07-18T00:00:00.000Z" }),
      trade({ id: "2", realizedPnl: 10, closedAt: "2026-07-19T00:00:00.000Z" }),
    ];
    expect(computeDrawdown(trades).maxDrawdown).toBe(0);
  });

  it("computes the largest peak-to-trough decline", () => {
    const trades = [
      trade({ id: "1", realizedPnl: 100, closedAt: "2026-07-17T00:00:00.000Z" }), // cum: 100 (peak)
      trade({ id: "2", realizedPnl: -60, closedAt: "2026-07-18T00:00:00.000Z" }), // cum: 40 (drawdown 60)
      trade({ id: "3", realizedPnl: 20, closedAt: "2026-07-19T00:00:00.000Z" }), // cum: 60
    ];
    const result = computeDrawdown(trades);
    expect(result.maxDrawdown).toBe(60);
    expect(result.maxDrawdownPct).toBeCloseTo(60, 5);
  });
});

describe("computeWinLossAverages", () => {
  it("computes average winner, average loser, and risk/reward ratio", () => {
    const trades = [
      trade({ id: "1", realizedPnl: 100, isWin: true }),
      trade({ id: "2", realizedPnl: 200, isWin: true }),
      trade({ id: "3", realizedPnl: -50, isWin: false }),
    ];
    const result = computeWinLossAverages(trades);
    expect(result.averageWinner).toBe(150);
    expect(result.averageLoser).toBe(-50);
    expect(result.riskRewardRatio).toBe(3);
  });

  it("returns zeros when there are no winners or losers", () => {
    expect(computeWinLossAverages([])).toEqual({ averageWinner: 0, averageLoser: 0, riskRewardRatio: 0 });
  });
});

describe("computePerformanceByInstrument", () => {
  it("groups by symbolCode and sorts by realized P&L descending", () => {
    const trades = [
      trade({ id: "1", symbolCode: "EURUSD", realizedPnl: 50, isWin: true }),
      trade({ id: "2", symbolCode: "GBPUSD", realizedPnl: 150, isWin: true }),
      trade({ id: "3", symbolCode: "EURUSD", realizedPnl: -20, isWin: false }),
    ];
    const result = computePerformanceByInstrument(trades);
    expect(result[0]!.symbolCode).toBe("GBPUSD");
    expect(result[1]!.symbolCode).toBe("EURUSD");
    expect(result[1]!.tradeCount).toBe(2);
    expect(result[1]!.realizedPnl).toBe(30);
    expect(result[1]!.winRate).toBe(50);
  });
});

describe("computePerformanceByHoldingDuration", () => {
  it("buckets trades by actual holding duration, not a timeframe field", () => {
    const trades = [
      trade({ id: "1", openedAt: "2026-07-19T10:00:00.000Z", closedAt: "2026-07-19T10:30:00.000Z" }), // 30 min
      trade({ id: "2", openedAt: "2026-07-19T10:00:00.000Z", closedAt: "2026-07-20T10:00:00.000Z" }), // 24h
    ];
    const result = computePerformanceByHoldingDuration(trades);
    expect(result.find((b) => b.label === "< 1 hour")?.tradeCount).toBe(1);
    expect(result.find((b) => b.label === "1-7 days")?.tradeCount).toBe(1);
  });

  it("omits empty buckets", () => {
    const trades = [trade({ openedAt: "2026-07-19T10:00:00.000Z", closedAt: "2026-07-19T10:10:00.000Z" })];
    const result = computePerformanceByHoldingDuration(trades);
    expect(result).toHaveLength(1);
  });
});

describe("computeDailyPnlCalendar", () => {
  it("aggregates realized P&L per calendar day, sorted ascending", () => {
    const trades = [
      trade({ id: "1", realizedPnl: 10, closedAt: "2026-07-19T08:00:00.000Z" }),
      trade({ id: "2", realizedPnl: 20, closedAt: "2026-07-19T18:00:00.000Z" }),
      trade({ id: "3", realizedPnl: -5, closedAt: "2026-07-18T08:00:00.000Z" }),
    ];
    const result = computeDailyPnlCalendar(trades);
    expect(result).toHaveLength(2);
    expect(result[0]!.date).toBe("2026-07-18");
    expect(result[1]!.date).toBe("2026-07-19");
    expect(result[1]!.realizedPnl).toBe(30);
    expect(result[1]!.tradeCount).toBe(2);
  });
});
