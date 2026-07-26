import { describe, expect, it } from "vitest";
import { PerformanceService } from "@rmsm/portfolio";
import { BacktestInterpretationService } from "../services/backtest-interpretation.service";
import { BacktestVerdict } from "../../domain/enums/backtest-intelligence.enum";
import { buildTrade } from "./fakes";

describe("BacktestInterpretationService", () => {
  const performanceService = new PerformanceService();
  const service = new BacktestInterpretationService();

  it("rates a run with REAL, strong PerformanceMetrics as STRONG", () => {
    const trades = [
      buildTrade("t1", 1.1, 1.2, new Date("2026-01-01")),
      buildTrade("t2", 1.1, 1.15, new Date("2026-01-02")),
      buildTrade("t3", 1.1, 1.12, new Date("2026-01-03")),
    ];
    const performance = performanceService.computeMetrics(trades, []);
    const run = { id: "run-1", strategyId: "s1", symbolCode: "EURUSD", periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-03"), trades };

    const result = service.interpret(run, performance);
    expect(result.verdict).toBe(BacktestVerdict.STRONG);
  });

  it("rates an empty run as WEAK", () => {
    const run = { id: "run-2", strategyId: "s1", symbolCode: "EURUSD", periodStart: new Date(), periodEnd: new Date(), trades: [] };
    const performance = performanceService.computeMetrics([], []);

    const result = service.interpret(run, performance);
    expect(result.verdict).toBe(BacktestVerdict.WEAK);
  });
});
