import { describe, expect, it } from "vitest";
import { PerformanceService } from "@rmsm/portfolio";
import { PerformanceSummaryService } from "../services/performance-summary.service";
import { buildTrade } from "./fakes";

describe("PerformanceSummaryService", () => {
  it("narrates REAL PerformanceMetrics without recomputing them", () => {
    const trades = [buildTrade("t1", 1.1, 1.15, new Date("2026-01-01"))];
    const performance = new PerformanceService().computeMetrics(trades, []);
    const run = { id: "run-1", strategyId: "s1", symbolCode: "EURUSD", periodStart: new Date(), periodEnd: new Date(), trades };

    const summary = new PerformanceSummaryService().summarize(run, performance);
    expect(summary.narrative).toContain("1 trade(s)");
    expect(summary.narrative).toContain(performance.winRate.toFixed(0));
  });
});
