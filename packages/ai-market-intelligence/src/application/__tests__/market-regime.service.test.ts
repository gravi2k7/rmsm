import { describe, expect, it } from "vitest";
import { MarketRegimeService } from "../services/market-regime.service";
import { MarketRegime } from "../../domain/enums/market-intelligence.enum";
import { buildCandles } from "./fakes";

describe("MarketRegimeService", () => {
  const service = new MarketRegimeService();

  it("detects TRENDING_UP for a strong sustained rise", () => {
    const candles = buildCandles([1.1, 1.12, 1.14, 1.16, 1.18, 1.2]);
    expect(service.detect(candles).regime).toBe(MarketRegime.TRENDING_UP);
  });

  it("detects VOLATILE for extreme swings regardless of direction", () => {
    const candles = buildCandles([1, 2, 1, 3, 1, 4]);
    expect(service.detect(candles).regime).toBe(MarketRegime.VOLATILE);
  });

  it("detects QUIET for flat, low-volatility closes", () => {
    const candles = buildCandles([1.1, 1.1, 1.1, 1.1]);
    expect(service.detect(candles).regime).toBe(MarketRegime.QUIET);
  });
});
