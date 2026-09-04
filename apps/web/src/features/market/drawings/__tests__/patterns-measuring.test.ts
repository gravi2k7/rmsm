import { describe, expect, it } from "vitest";
import {
  forecastEnd,
  measurement,
  patternSegments,
  projectionEnd,
} from "../tools/patterns-measuring";

const a = { time: 100, price: 10 };
const b = { time: 200, price: 20 };
const c = { time: 300, price: 15 };
const d = { time: 400, price: 25 };
const e = { time: 500, price: 18 };

describe("MKT-UI-008 patterns", () => {
  it("builds ABCD segments", () => {
    expect(patternSegments("ABCD", [a, b, c, d])).toHaveLength(3);
  });

  it("builds XABCD segments", () => {
    expect(
      patternSegments("XABCD", [a, b, c, d, e]),
    ).toHaveLength(4);
  });

  it("builds head and shoulders segments", () => {
    expect(
      patternSegments(
        "HEAD_SHOULDERS",
        [a, b, c, d, e],
      ),
    ).toHaveLength(4);
  });

  it("builds triangle and wedge boundaries", () => {
    expect(
      patternSegments("TRIANGLE", [a, b, c, d]),
    ).toHaveLength(2);

    expect(
      patternSegments("WEDGE", [a, b, c, d]),
    ).toHaveLength(2);
  });
});

describe("MKT-UI-008 forecasting", () => {
  it("projects a forecast endpoint", () => {
    expect(forecastEnd([a, b])).toEqual({
      time: 300,
      price: 30,
    });
  });

  it("projects a projection endpoint", () => {
    expect(projectionEnd([a, b])).toEqual({
      time: 300,
      price: 30,
    });
  });
});

describe("MKT-UI-008 measuring", () => {
  it("calculates price and time deltas", () => {
    expect(measurement(a, b)).toEqual({
      priceDelta: 10,
      timeDelta: 100,
      priceRange: 10,
      direction: "UP",
    });
  });

  it("handles downward measurements", () => {
    expect(measurement(b, c).direction).toBe("DOWN");
  });
});
