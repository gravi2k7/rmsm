import { describe, expect, it } from "vitest";
import { PerformanceService } from "@rmsm/portfolio";
import { BacktestComparisonService } from "../services/backtest-comparison.service";
import { InvalidComparisonSetError } from "../../domain/errors/backtest-intelligence-domain.errors";
import { buildTrade } from "./fakes";

describe("BacktestComparisonService", () => {
  const performanceService = new PerformanceService();
  const service = new BacktestComparisonService();

  it("picks the run with the higher REAL profit factor as the winner", () => {
    const strongTrades = [buildTrade("t1", 1.0, 1.5, new Date("2026-01-01"))];
    const weakTrades = [buildTrade("t2", 1.0, 0.9, new Date("2026-01-01"))];

    const comparison = service.compare([
      { runId: "run-strong", strategyId: "s1", performance: performanceService.computeMetrics(strongTrades, []) },
      { runId: "run-weak", strategyId: "s2", performance: performanceService.computeMetrics(weakTrades, []) },
    ]);

    expect(comparison.winnerRunId).toBe("run-strong");
  });

  it("throws InvalidComparisonSetError with fewer than 2 runs", () => {
    const trades = [buildTrade("t1", 1.0, 1.1, new Date("2026-01-01"))];
    expect(() => service.compare([{ runId: "run-1", strategyId: "s1", performance: performanceService.computeMetrics(trades, []) }])).toThrow(InvalidComparisonSetError);
  });
});
