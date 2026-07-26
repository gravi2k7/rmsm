import { describe, expect, it } from "vitest";
import { PatternDetectionService } from "../services/pattern-detection.service";
import { TradePatternType } from "../../domain/enums/backtest-intelligence.enum";
import { EmptyTradeSetError } from "../../domain/errors/backtest-intelligence-domain.errors";
import { buildTrade } from "./fakes";

describe("PatternDetectionService", () => {
  const service = new PatternDetectionService();

  it("detects a losing streak across REAL, unmodified Trade records", () => {
    const trades = [
      buildTrade("t1", 1.1, 1.0, new Date("2026-01-01")),
      buildTrade("t2", 1.1, 1.0, new Date("2026-01-02")),
      buildTrade("t3", 1.1, 1.0, new Date("2026-01-03")),
    ];
    const result = service.detect("run-1", trades);
    expect(result.patterns.some((p) => p.type === TradePatternType.LOSING_STREAK)).toBe(true);
  });

  it("detects a large-loss outlier", () => {
    const trades = [buildTrade("t1", 1.0, 0.0, new Date("2026-01-01"), 2000)];
    const result = service.detect("run-1", trades);
    expect(result.patterns.some((p) => p.type === TradePatternType.LARGE_LOSS_OUTLIER)).toBe(true);
  });

  it("throws EmptyTradeSetError for an empty trade list", () => {
    expect(() => service.detect("run-1", [])).toThrow(EmptyTradeSetError);
  });
});
