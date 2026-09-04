import { describe, expect, it } from "vitest";

import {
  fibonacciExtensionLevels,
  fibonacciProjectionLevels,
  fibonacciRetracementLevels,
  fibonacciTimeLevels,
} from "../tools/fibonacci";

describe("MKT-UI-007 Fibonacci toolkit", () => {
  const a = { time: 100, price: 100 };
  const b = { time: 200, price: 200 };
  const c = { time: 300, price: 150 };

  it("calculates Fibonacci retracement levels", () => {
    const levels = fibonacciRetracementLevels(a, b);

    expect(levels).toHaveLength(7);
    expect(levels[0]?.price).toBe(200);
    expect(levels[3]?.price).toBe(150);
    expect(levels[6]?.price).toBe(100);
  });

  it("calculates bearish Fibonacci retracement levels", () => {
    const levels = fibonacciRetracementLevels(b, a);

    expect(levels[0]?.price).toBe(100);
    expect(levels[3]?.price).toBe(150);
    expect(levels[6]?.price).toBe(200);
  });

  it("calculates Fibonacci extension levels", () => {
    const levels = fibonacciExtensionLevels(
      a,
      b,
      c,
    );

    expect(levels).toHaveLength(7);
    expect(levels[0]?.price).toBe(150);
    expect(levels[2]?.price).toBe(250);
    expect(levels[3]?.price).toBeCloseTo(277.2);
  });

  it("calculates Fibonacci projection levels", () => {
    const levels = fibonacciProjectionLevels(
      a,
      b,
      c,
    );

    expect(levels).toHaveLength(7);
    expect(levels[0]?.price).toBe(150);
    expect(levels[2]?.price).toBe(250);
    expect(levels[4]?.price).toBeCloseTo(311.8);
  });

  it("calculates Fibonacci time levels", () => {
    const levels = fibonacciTimeLevels(a, b);

    expect(levels).toHaveLength(7);
    expect(levels[0]?.time).toBe(100);
    expect(levels[2]?.time).toBe(200);
    expect(levels[3]?.time).toBeCloseTo(261.8);
  });

  it("keeps ratio labels stable", () => {
    const levels = fibonacciRetracementLevels(a, b);

    expect(levels.map((level) => level.label)).toEqual([
      "0%",
      "23.6%",
      "38.2%",
      "50%",
      "61.8%",
      "78.6%",
      "100%",
    ]);
  });
});
