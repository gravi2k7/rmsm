import { describe, expect, it } from "vitest";

import {
  getDrawingToolAdapter,
  isDrawingComplete,
} from "../drawing-engine";
import { getDrawingTool } from "../registry";

const tools = [
  ["PARALLEL_CHANNEL", 3],
  ["PRICE_CHANNEL", 3],
  ["REGRESSION_CHANNEL", 3],
  ["FIB_RETRACEMENT", 2],
  ["FIB_EXTENSION", 3],
  ["FIB_PROJECTION", 3],
  ["FIB_TIME", 2],
  ["ABCD", 4],
  ["XABCD", 5],
  ["HEAD_SHOULDERS", 5],
  ["TRIANGLE", 4],
  ["WEDGE", 4],
  ["FORECAST", 2],
  ["PROJECTION", 2],
  ["MEASURE_PRICE", 2],
  ["MEASURE_TIME", 2],
  ["MEASURE_PRICE_TIME", 2],
  ["MEASURE_RANGE", 2],
] as const;

describe("MKT-UI-005 advanced drawing tools", () => {
  it.each(tools)(
    "registers %s with %s points",
    (type, points) => {
      expect(getDrawingTool(type)).toBeDefined();

      const adapter = getDrawingToolAdapter(type);

      expect(adapter.type).toBe(type);
      expect(adapter.minPoints).toBe(points);
      expect(adapter.maxPoints).toBe(points);
    },
  );

  it.each(tools)(
    "completes %s at its required point count",
    (type, points) => {
      expect(
        isDrawingComplete(
          type,
          Array.from({ length: points }, (_, index) => ({
            time: index + 1,
            price: index + 10,
          })),
        ),
      ).toBe(true);
    },
  );

  it.each(tools)(
    "does not complete %s before its required point count",
    (type, points) => {
      expect(
        isDrawingComplete(
          type,
          Array.from(
            { length: Math.max(0, points - 1) },
            (_, index) => ({
              time: index + 1,
              price: index + 10,
            }),
          ),
        ),
      ).toBe(false);
    },
  );
});
