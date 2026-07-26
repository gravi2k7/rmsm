import { describe, expect, it } from "vitest";
import { MarketAnalysisService } from "../services/market-analysis.service";
import { TrendDirection, VolatilityLevel, MarketStructure, LiquidityLevel, TradingSession } from "../../domain/enums/market-intelligence.enum";
import { InsufficientCandlesError } from "../../domain/errors/market-intelligence-domain.errors";
import { buildCandles } from "./fakes";

describe("MarketAnalysisService", () => {
  const service = new MarketAnalysisService();

  describe("analyzeTrend", () => {
    it("detects an upward trend for steadily rising closes", () => {
      const candles = buildCandles([1.1, 1.11, 1.12, 1.13, 1.14, 1.15]);
      const result = service.analyzeTrend(candles);
      expect(result.direction).toBe(TrendDirection.UP);
      expect(result.strength).toBeGreaterThan(0);
    });

    it("detects sideways for flat closes", () => {
      const candles = buildCandles([1.1, 1.1, 1.1, 1.1]);
      const result = service.analyzeTrend(candles);
      expect(result.direction).toBe(TrendDirection.SIDEWAYS);
    });

    it("throws InsufficientCandlesError with fewer than 2 candles", () => {
      expect(() => service.analyzeTrend(buildCandles([1.1]))).toThrow(InsufficientCandlesError);
    });
  });

  describe("analyzeMomentum", () => {
    it("computes rate of change and detects acceleration", () => {
      const candles = buildCandles([100, 102, 105, 110, 118, 130]);
      const result = service.analyzeMomentum(candles);
      expect(result.rateOfChange).toBeCloseTo(30, 1);
      expect(result.accelerating).toBe(true);
    });
  });

  describe("analyzeVolatility", () => {
    it("classifies near-flat closes as LOW volatility", () => {
      const candles = buildCandles([1.1, 1.1001, 1.1, 1.1001, 1.1]);
      expect(service.analyzeVolatility(candles).level).toBe(VolatilityLevel.LOW);
    });

    it("classifies large swings as EXTREME volatility", () => {
      const candles = buildCandles([1, 2, 1, 3, 1, 4]);
      expect(service.analyzeVolatility(candles).level).toBe(VolatilityLevel.EXTREME);
    });
  });

  describe("analyzeStructure", () => {
    it("detects UPTREND structure for rising highs and lows", () => {
      const candles = buildCandles([1.1, 1.11, 1.12, 1.13, 1.14, 1.15]);
      const result = service.analyzeStructure(candles);
      expect(result.structure).toBe(MarketStructure.UPTREND);
      expect(result.higherHighs).toBe(true);
      expect(result.higherLows).toBe(true);
    });

    it("detects CONSOLIDATION for flat highs and lows", () => {
      const candles = buildCandles([1.1, 1.1, 1.1, 1.1]);
      expect(service.analyzeStructure(candles).structure).toBe(MarketStructure.CONSOLIDATION);
    });
  });

  describe("analyzeLiquidity", () => {
    it("classifies high average volume as HIGH liquidity", () => {
      const candles = buildCandles([1.1, 1.1, 1.1], [20000, 25000, 22000]);
      expect(service.analyzeLiquidity(candles).level).toBe(LiquidityLevel.HIGH);
    });

    it("classifies low average volume as LOW liquidity", () => {
      const candles = buildCandles([1.1, 1.1, 1.1], [10, 5, 8]);
      expect(service.analyzeLiquidity(candles).level).toBe(LiquidityLevel.LOW);
    });
  });

  describe("analyzeSession", () => {
    it("maps UTC hours to the correct trading session", () => {
      expect(service.analyzeSession(new Date(Date.UTC(2026, 0, 1, 3))).session).toBe(TradingSession.ASIAN);
      expect(service.analyzeSession(new Date(Date.UTC(2026, 0, 1, 10))).session).toBe(TradingSession.LONDON);
      expect(service.analyzeSession(new Date(Date.UTC(2026, 0, 1, 14))).session).toBe(TradingSession.LONDON_NEW_YORK_OVERLAP);
      expect(service.analyzeSession(new Date(Date.UTC(2026, 0, 1, 18))).session).toBe(TradingSession.NEW_YORK);
      expect(service.analyzeSession(new Date(Date.UTC(2026, 0, 1, 22))).session).toBe(TradingSession.CLOSED);
    });
  });
});
