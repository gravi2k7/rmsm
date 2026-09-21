import { describe, expect, it } from "vitest";
import {
  DRAWING_TOOL_DEFINITIONS,
  getDrawingTool,
} from "../registry";

describe("drawing registry", () => {
  it("registers all drawing tools", () => {
    expect(
      DRAWING_TOOL_DEFINITIONS.map(
        (tool) => tool.type,
      ),
    ).toEqual([
      "SELECT",
      "TREND_LINE",
      "HORIZONTAL_LINE",
      "VERTICAL_LINE",
      "RAY",
      "RECTANGLE",
      "ARROW",
      "TEXT",
      "EXTENDED_LINE",
      "CROSS_LINE",
      "CIRCLE",
      "POLYLINE",
      "NOTE",
      "CALLOUT",
      "PRICE_LABEL",
      "PARALLEL_CHANNEL",
      "PRICE_CHANNEL",
      "REGRESSION_CHANNEL",
      "FIB_RETRACEMENT",
      "FIB_EXTENSION",
      "FIB_PROJECTION",
      "FIB_TIME",
      "FIB_CHANNEL",
      "ABCD",
      "XABCD",
      "HEAD_SHOULDERS",
      "TRIANGLE",
      "WEDGE",
      "FORECAST",
      "PROJECTION",
      "MEASURE_PRICE",
      "MEASURE_TIME",
      "MEASURE_PRICE_TIME",
      "MEASURE_RANGE",
      "LONG_POSITION",
      "SHORT_POSITION",
    ]);
  });

  it("returns tool metadata", () => {
    expect(
      getDrawingTool("TREND_LINE"),
    ).toEqual({
      type: "TREND_LINE",
      label: "Trend Line",
      minPoints: 2,
      maxPoints: 2,
    });
  });

  it("returns undefined for an unregistered tool", () => {
    expect(
      getDrawingTool("SELECT"),
    ).toBeDefined();
  });
});
