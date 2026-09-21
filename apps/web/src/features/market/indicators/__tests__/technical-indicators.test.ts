import { describe, expect, it } from "vitest";
import {
  calculateADX,
  calculateATR,
  calculateBollingerBands,
  calculateCCI,
  calculateEMA,
  calculateMACD,
  calculateOBV,
  calculateROC,
  calculateRSI,
  calculateSMA,
  calculateStochastic,
  calculateVolume,
  calculateVWAP,
  calculateVWMA,
  calculateWMA,
  calculateWilliamsR,
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

  it("calculates VWMA", () => {
    const values = calculateVWMA(candles, 3);

    expect(values).toHaveLength(candles.length);
    expect(values.slice(0, 2)).toEqual([null, null]);

    const expected =
      (102 * 1020 + 103 * 1030 + 104 * 1040) /
      (1020 + 1030 + 1040);

    expect(values[4]).toBeCloseTo(expected, 10);
  });

  it("calculates CCI", () => {
    const testCandles = [
      { time: 0, open: 9, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1, open: 10, high: 12, low: 10, close: 11, volume: 100 },
      { time: 2, open: 11, high: 13, low: 11, close: 12, volume: 100 },
    ];

    const values = calculateCCI(testCandles, 3);

    expect(values).toHaveLength(3);
    expect(values.slice(0, 2)).toEqual([null, null]);
    expect(values[2]).toBeCloseTo(100, 10);
  });

  it("calculates ROC", () => {
    const values = calculateROC(
      [100, 105, 110, 120],
      2,
    );

    expect(values).toEqual([
      null,
      null,
      10,
      (120 - 105) / 105 * 100,
    ]);
  });

  it("calculates Williams %R", () => {
    const testCandles = [
      { time: 0, open: 9, high: 12, low: 8, close: 10, volume: 100 },
      { time: 1, open: 10, high: 14, low: 9, close: 13, volume: 100 },
      { time: 2, open: 12, high: 15, low: 10, close: 11, volume: 100 },
    ];

    const values = calculateWilliamsR(testCandles, 3);

    expect(values).toHaveLength(3);
    expect(values.slice(0, 2)).toEqual([null, null]);
    expect(values[2]).toBeCloseTo(-57.142857142857146, 10);
  });

  it("calculates OBV", () => {
    const testCandles = [
      { time: 0, open: 9, high: 11, low: 8, close: 10, volume: 100 },
      { time: 1, open: 10, high: 12, low: 9, close: 12, volume: 200 },
      { time: 2, open: 12, high: 13, low: 10, close: 11, volume: 150 },
      { time: 3, open: 11, high: 14, low: 10, close: 11, volume: 175 },
    ];

    expect(calculateOBV(testCandles)).toEqual([
      0,
      200,
      50,
      50,
    ]);
  });

  it("calculates Volume", () => {
    expect(calculateVolume(candles)).toEqual(
      candles.map((candle) => candle.volume),
    );
  });

  it("rejects invalid periods", () => {
    expect(() => calculateSMA([1, 2, 3], 0)).toThrow();
    expect(() => calculateEMA([1, 2, 3], 0)).toThrow();
    expect(() => calculateWMA([1, 2, 3], 0)).toThrow();
    expect(() => calculateRSI([1, 2, 3], 0)).toThrow();
    expect(() => calculateVWMA(candles, 0)).toThrow();
    expect(() => calculateCCI(candles, 0)).toThrow();
    expect(() => calculateROC([1, 2, 3], 0)).toThrow();
    expect(() => calculateWilliamsR(candles, 0)).toThrow();
  });
});
