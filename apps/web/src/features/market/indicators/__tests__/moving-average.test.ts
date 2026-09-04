import { describe, expect, it } from "vitest";
import {
  calculateEMA,
  calculateSMA,
  toIndicatorPoints,
} from "../moving-average";

describe("moving averages", () => {
  it("calculates SMA", () => {
    expect(calculateSMA([1, 2, 3, 4, 5], 3)).toEqual([
      null,
      null,
      2,
      3,
      4,
    ]);
  });

  it("calculates EMA", () => {
    const result = calculateEMA([1, 2, 3, 4, 5], 3);

    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBe(2);
    expect(result[3]).toBe(3);
    expect(result[4]).toBe(4);
  });

  it("returns no values before the configured period", () => {
    expect(calculateSMA([10, 20], 3)).toEqual([
      null,
      null,
    ]);

    expect(calculateEMA([10, 20], 3)).toEqual([
      null,
      null,
    ]);
  });

  it("converts valid values into indicator points", () => {
    expect(
      toIndicatorPoints(
        [100, 200, 300],
        [null, 10, 20],
      ),
    ).toEqual([
      {
        time: 200,
        value: 10,
      },
      {
        time: 300,
        value: 20,
      },
    ]);
  });

  it("rejects invalid periods", () => {
    expect(() => calculateSMA([1, 2, 3], 0)).toThrow(
      "Moving-average period must be a positive integer.",
    );

    expect(() => calculateEMA([1, 2, 3], 1.5)).toThrow(
      "Moving-average period must be a positive integer.",
    );
  });
});
