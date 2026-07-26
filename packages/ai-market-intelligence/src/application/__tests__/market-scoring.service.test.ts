import { describe, expect, it } from "vitest";
import { MarketScoringService } from "../services/market-scoring.service";
import { buildCandles } from "./fakes";

describe("MarketScoringService", () => {
  const service = new MarketScoringService();

  it("produces a 0..100 overall score with per-dimension components", () => {
    const candles = buildCandles([1.1, 1.11, 1.12, 1.13, 1.14, 1.15], [5000, 5200, 5400, 5600, 5800, 6000]);
    const score = service.score(candles);

    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(Object.keys(score.components)).toEqual(["trend", "volatility", "structure", "liquidity"]);
  });
});
