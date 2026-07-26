import { describe, expect, it } from "vitest";
import { Timeframe } from "@rmsm/market";
import { MultiTimeframeAnalysisService } from "../services/multi-timeframe-analysis.service";
import { TrendDirection } from "../../domain/enums/market-intelligence.enum";
import { EmptyTimeframeSetError } from "../../domain/errors/market-intelligence-domain.errors";
import { buildCandles } from "./fakes";

describe("MultiTimeframeAnalysisService", () => {
  const service = new MultiTimeframeAnalysisService();

  it("reports aligned when every timeframe trends the same direction", () => {
    const rising = [1.1, 1.11, 1.12, 1.13, 1.14, 1.15];
    const candlesByTimeframe = new Map([
      [Timeframe.M1, buildCandles(rising)],
      [Timeframe.H1, buildCandles(rising)],
    ]);

    const result = service.analyze(candlesByTimeframe);
    expect(result.aligned).toBe(true);
    expect(result.dominantDirection).toBe(TrendDirection.UP);
  });

  it("reports not aligned when timeframes disagree", () => {
    const candlesByTimeframe = new Map([
      [Timeframe.M1, buildCandles([1.1, 1.11, 1.12, 1.13, 1.14, 1.15])],
      [Timeframe.H1, buildCandles([1.15, 1.14, 1.13, 1.12, 1.11, 1.1])],
    ]);

    const result = service.analyze(candlesByTimeframe);
    expect(result.aligned).toBe(false);
  });

  it("throws EmptyTimeframeSetError for an empty map", () => {
    expect(() => service.analyze(new Map())).toThrow(EmptyTimeframeSetError);
  });
});
