import * as ti from "../technical-indicators";
import type { OhlcvBar } from "../technical-indicators";

function bar(overrides: Partial<OhlcvBar> = {}): OhlcvBar {
  return { eventTime: new Date("2026-01-01T00:00:00Z"), open: 100, high: 101, low: 99, close: 100, volume: 1000, ...overrides };
}

describe("technical-indicators", () => {
  describe("sma", () => {
    it("returns null when there is not enough data", () => {
      expect(ti.sma([1, 2, 3], 5)).toBeNull();
    });

    it("computes the simple average of the trailing window", () => {
      expect(ti.sma([1, 2, 3, 4, 5], 3)).toBeCloseTo((3 + 4 + 5) / 3);
    });
  });

  describe("ema", () => {
    it("returns null when there is not enough data", () => {
      expect(ti.ema([1, 2], 5)).toBeNull();
    });

    it("converges toward a constant series' value", () => {
      const values = new Array(50).fill(10);
      expect(ti.ema(values, 10)).toBeCloseTo(10);
    });
  });

  describe("rsi", () => {
    it("returns null when there is not enough data", () => {
      expect(ti.rsi([1, 2, 3], 14)).toBeNull();
    });

    it("returns 100 for a strictly increasing series (no losses)", () => {
      const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
      expect(ti.rsi(closes, 14)).toBe(100);
    });

    it("returns a value between 0 and 100 for mixed data", () => {
      const closes = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 110, 108, 111, 112, 110];
      const value = ti.rsi(closes, 14);
      expect(value).not.toBeNull();
      expect(value!).toBeGreaterThanOrEqual(0);
      expect(value!).toBeLessThanOrEqual(100);
    });
  });

  describe("atr", () => {
    it("returns null when there is not enough data", () => {
      expect(ti.atr([bar(), bar()], 14)).toBeNull();
    });

    it("computes a positive value for bars with real range", () => {
      const bars = Array.from({ length: 20 }, (_, i) => bar({ high: 105 + i, low: 95 + i, close: 100 + i }));
      const value = ti.atr(bars, 14);
      expect(value).not.toBeNull();
      expect(value!).toBeGreaterThan(0);
    });
  });

  describe("macd", () => {
    it("returns null when there is not enough data", () => {
      expect(ti.macd([1, 2, 3])).toBeNull();
    });

    it("returns macd/signal/histogram for a long enough series", () => {
      const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 5) * 5);
      const result = ti.macd(closes);
      expect(result).not.toBeNull();
      expect(result!.histogram).toBeCloseTo(result!.macd - result!.signal);
    });
  });

  describe("bollingerBands", () => {
    it("returns null when there is not enough data", () => {
      expect(ti.bollingerBands([1, 2, 3], 20)).toBeNull();
    });

    it("upper band is above middle, lower band is below middle", () => {
      const closes = Array.from({ length: 30 }, (_, i) => 100 + (i % 2 === 0 ? 2 : -2));
      const result = ti.bollingerBands(closes, 20);
      expect(result).not.toBeNull();
      expect(result!.upper).toBeGreaterThan(result!.middle);
      expect(result!.lower).toBeLessThan(result!.middle);
    });

    it("bands collapse to the middle for a perfectly flat series", () => {
      const closes = new Array(25).fill(50);
      const result = ti.bollingerBands(closes, 20);
      expect(result).not.toBeNull();
      expect(result!.upper).toBeCloseTo(result!.middle);
      expect(result!.lower).toBeCloseTo(result!.middle);
    });
  });

  describe("vwap", () => {
    it("returns null for an empty series", () => {
      expect(ti.vwap([])).toBeNull();
    });

    it("returns null when total volume is zero", () => {
      expect(ti.vwap([bar({ volume: 0 }), bar({ volume: 0 })])).toBeNull();
    });

    it("computes the volume-weighted typical price", () => {
      const bars = [bar({ high: 10, low: 8, close: 9, volume: 100 }), bar({ high: 20, low: 18, close: 19, volume: 100 })];
      const value = ti.vwap(bars);
      // typical prices: 9, 19 — equal volumes, so vwap is their simple average.
      expect(value).toBeCloseTo(14);
    });
  });

  describe("pivotPoints", () => {
    it("computes standard floor pivot levels from the prior bar's H/L/C", () => {
      const result = ti.pivotPoints(bar({ high: 110, low: 90, close: 100 }));
      const expectedPivot = (110 + 90 + 100) / 3;
      expect(result.pivot).toBeCloseTo(expectedPivot);
      expect(result.r1).toBeCloseTo(2 * expectedPivot - 90);
      expect(result.s1).toBeCloseTo(2 * expectedPivot - 110);
      expect(result.r1).toBeGreaterThan(result.pivot);
      expect(result.s1).toBeLessThan(result.pivot);
    });
  });

  describe("realizedVolatility", () => {
    it("returns null when there is not enough data", () => {
      expect(ti.realizedVolatility([1, 2, 3], 20)).toBeNull();
    });

    it("returns 0 for a perfectly flat series", () => {
      const closes = new Array(25).fill(100);
      expect(ti.realizedVolatility(closes, 20)).toBeCloseTo(0);
    });

    it("returns a higher value for a more volatile series", () => {
      const flat = new Array(25).fill(100);
      const volatile = Array.from({ length: 25 }, (_, i) => 100 + (i % 2 === 0 ? 10 : -10));
      expect(ti.realizedVolatility(volatile, 20)!).toBeGreaterThan(ti.realizedVolatility(flat, 20)!);
    });
  });

  describe("classifyTrend", () => {
    it("returns null when there is not enough data", () => {
      expect(ti.classifyTrend([1, 2, 3], 50)).toBeNull();
    });

    it("classifies uptrend when price is well above the baseline SMA", () => {
      const closes = [...new Array(50).fill(100), 200];
      expect(ti.classifyTrend(closes, 50)).toBe("uptrend");
    });

    it("classifies downtrend when price is well below the baseline SMA", () => {
      const closes = [...new Array(50).fill(100), 10];
      expect(ti.classifyTrend(closes, 50)).toBe("downtrend");
    });

    it("classifies sideways within the deadband", () => {
      const closes = new Array(51).fill(100);
      expect(ti.classifyTrend(closes, 50)).toBe("sideways");
    });
  });

  describe("classifyVolatility", () => {
    it("returns null for a null input", () => {
      expect(ti.classifyVolatility(null)).toBeNull();
    });

    it("buckets into low/moderate/high", () => {
      expect(ti.classifyVolatility(0.5)).toBe("low");
      expect(ti.classifyVolatility(2)).toBe("moderate");
      expect(ti.classifyVolatility(5)).toBe("high");
    });
  });
});
