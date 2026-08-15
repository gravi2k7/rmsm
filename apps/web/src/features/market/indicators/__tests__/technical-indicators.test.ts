import { describe, expect, it } from "vitest";
import {
  calculateADX,
  calculateATR,
  calculateBollingerBands,
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateSMA,
  calculateStochastic,
  calculateVWAP,
  calculateWMA,
} from "../technical-indicators";

const candles = Array.from({ length: 40 }, (_, index) => {
  const close = 100 + index;

  return {
    time: index,
    open: close - 0.5,
    high: close + 2,
    low: close - 2,
    close,
    volume: 1000 + index * 10,
  };
});

describe("technical indicators", () => {
  it("calculates SMA, EMA and WMA", () => {
    expect(calculateSMA([1, 2, 3, 4, 5], 3)).toEqual([
      null,
      null,
      2,
      3,
      4,
    ]);

    expect(calculateEMA([1, 2, 3, 4, 5], 3)).toEqual([
      null,
      null,
      2,
      3,
      4,
    ]);

    expect(calculateWMA([1, 2, 3, 4, 5], 3)).toEqual([
      null,
      null,
      14 / 6,
      20 / 6,
      26 / 6,
    ]);
  });

  it("calculates VWAP", () => {
    const values = calculateVWAP(candles);

    expect(values).toHaveLength(candles.length);
    expect(values[0]).toBeCloseTo(100);
    expect(values.at(-1)).toBeGreaterThan(100);
  });

  it("calculates Bollinger Bands", () => {
    const values = calculateBollingerBands(
      candles.map((c) => c.close),
      20,
      2,
    );

    expect(values).toHaveLength(21);
    expect(values[0]!.upper).toBeGreaterThan(
      values[0]!.middle,
    );
    expect(values[0]!.lower).toBeLessThan(
      values[0]!.middle,
    );
  });

  it("calculates RSI", () => {
    const values = calculateRSI(
      candles.map((c) => c.close),
      14,
    );

    expect(values).toHaveLength(candles.length);
    expect(values[14]).toBe(100);
  });

  it("calculates MACD", () => {
    const values = calculateMACD(
      candles.map((c) => c.close),
      12,
      26,
      9,
    );

    expect(values.length).toBeGreaterThan(0);

    const last = values.at(-1)!;

    expect(last.macd).toBeGreaterThanOrEqual(0);
  });

  it("calculates Stochastic", () => {
    const values = calculateStochastic(
      candles,
      14,
      3,
      3,
    );

    expect(values.length).toBeGreaterThan(0);

    for (const point of values) {
      expect(point.k).toBeGreaterThanOrEqual(0);
      expect(point.k).toBeLessThanOrEqual(100);
    }
  });

  it("calculates ATR", () => {
    const values = calculateATR(candles, 14);

    expect(values).toHaveLength(candles.length);
    expect(values[13]).not.toBeNull();
    expect(values.at(-1)).toBeGreaterThan(0);
  });

  it("calculates ADX", () => {
    const values = calculateADX(candles, 14);

    expect(values.length).toBeGreaterThan(0);

    const last = values.at(-1)!;

    expect(last.adx).not.toBeNull();
    expect(last.plusDi).not.toBeNull();
    expect(last.minusDi).not.toBeNull();
  });

  it("rejects invalid periods", () => {
    expect(() => calculateSMA([1, 2, 3], 0)).toThrow();
    expect(() => calculateEMA([1, 2, 3], 0)).toThrow();
    expect(() => calculateWMA([1, 2, 3], 0)).toThrow();
    expect(() => calculateRSI([1, 2, 3], 0)).toThrow();
  });
});
