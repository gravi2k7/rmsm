import { describe, expect, it } from "vitest";
import { StrategyPerformanceAnalysisService } from "../services/strategy-performance-analysis.service";
import { FixedClock } from "./fakes";

describe("StrategyPerformanceAnalysisService", () => {
  it("returns null when no provider is wired in", async () => {
    const service = new StrategyPerformanceAnalysisService(undefined, new FixedClock());
    expect(await service.analyze("strategy-1")).toBeNull();
  });

  it("returns null when the provider has no data for this strategy", async () => {
    const service = new StrategyPerformanceAnalysisService({ getPerformance: async () => null }, new FixedClock());
    expect(await service.analyze("strategy-1")).toBeNull();
  });

  it("maps a provider's real performance data into a summary", async () => {
    const service = new StrategyPerformanceAnalysisService(
      { getPerformance: async () => ({ totalTrades: 42, winRate: 0.55, averageReturn: 0.012 }) },
      new FixedClock(),
    );
    const summary = await service.analyze("strategy-1");
    expect(summary).toEqual({ strategyId: "strategy-1", totalTrades: 42, winRate: 0.55, averageReturn: 0.012, generatedAt: new Date("2026-01-01T00:00:00.000Z") });
  });
});
