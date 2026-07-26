import { describe, expect, it } from "vitest";
import { TradeDistributionAnalysisService } from "../services/trade-distribution-analysis.service";
import { EmptyTradeSetError } from "../../domain/errors/backtest-intelligence-domain.errors";
import { buildTrade } from "./fakes";

describe("TradeDistributionAnalysisService", () => {
  const service = new TradeDistributionAnalysisService();

  it("buckets REAL Trade.realizedPnl values and computes mean/median/stddev", () => {
    const trades = [
      buildTrade("t1", 1.0, 1.6, new Date("2026-01-01"), 1000), // +600 -> Big Win
      buildTrade("t2", 1.0, 0.9, new Date("2026-01-02"), 1000), // -100 -> Loss
    ];
    const result = service.analyze("run-1", trades);

    expect(result.buckets.find((b) => b.rangeLabel.startsWith("Big Win"))?.count).toBe(1);
    expect(result.buckets.find((b) => b.rangeLabel === "Loss")?.count).toBe(1);
    expect(result.meanPnl).toBeCloseTo(250, 5);
  });

  it("throws EmptyTradeSetError for an empty trade list", () => {
    expect(() => service.analyze("run-1", [])).toThrow(EmptyTradeSetError);
  });
});
