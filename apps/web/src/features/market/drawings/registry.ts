import type {
  DrawingToolDefinition,
  DrawingType,
} from "./types";

export const DRAWING_TOOL_DEFINITIONS: readonly DrawingToolDefinition[] = [
  {
    type: "SELECT",
    label: "Select",
    minPoints: 0,
    maxPoints: 0,
  },
  {
    type: "TREND_LINE",
    label: "Trend Line",
    minPoints: 2,
    maxPoints: 2,
  },
  {
    type: "HORIZONTAL_LINE",
    label: "Horizontal Line",
    minPoints: 1,
    maxPoints: 1,
  },
  {
    type: "VERTICAL_LINE",
    label: "Vertical Line",
    minPoints: 1,
    maxPoints: 1,
  },
  {
    type: "RAY",
    label: "Ray",
    minPoints: 2,
    maxPoints: 2,
  },
  {
    type: "RECTANGLE",
    label: "Rectangle",
    minPoints: 2,
    maxPoints: 2,
  },
  {
    type: "ARROW",
    label: "Arrow",
    minPoints: 2,
    maxPoints: 2,
  },
  {
    type: "TEXT",
    label: "Text",
    minPoints: 1,
    maxPoints: 1,
  },

  {
    type: "PARALLEL_CHANNEL",
    label: "Parallel Channel",
    minPoints: 3,
    maxPoints: 3,
  },
  {
    type: "PRICE_CHANNEL",
    label: "Price Channel",
    minPoints: 3,
    maxPoints: 3,
  },
  {
    type: "REGRESSION_CHANNEL",
    label: "Regression Channel",
    minPoints: 3,
    maxPoints: 3,
  },

  {
    type: "FIB_RETRACEMENT",
    label: "Fibonacci Retracement",
    minPoints: 2,
    maxPoints: 2,
  },
  {
    type: "FIB_EXTENSION",
    label: "Fibonacci Extension",
    minPoints: 3,
    maxPoints: 3,
  },
  {
    type: "FIB_PROJECTION",
    label: "Fibonacci Projection",
    minPoints: 3,
    maxPoints: 3,
  },
  {
    type: "FIB_TIME",
    label: "Fibonacci Time",
    minPoints: 2,
    maxPoints: 2,
  },

  {
    type: "ABCD",
    label: "ABCD Pattern",
    minPoints: 4,
    maxPoints: 4,
  },
  {
    type: "XABCD",
    label: "XABCD Pattern",
    minPoints: 5,
    maxPoints: 5,
  },
  {
    type: "HEAD_SHOULDERS",
    label: "Head & Shoulders",
    minPoints: 5,
    maxPoints: 5,
  },
  {
    type: "TRIANGLE",
    label: "Triangle Pattern",
    minPoints: 4,
    maxPoints: 4,
  },
  {
    type: "WEDGE",
    label: "Wedge Pattern",
    minPoints: 4,
    maxPoints: 4,
  },

  {
    type: "FORECAST",
    label: "Forecast",
    minPoints: 2,
    maxPoints: 2,
  },
  {
    type: "PROJECTION",
    label: "Projection",
    minPoints: 2,
    maxPoints: 2,
  },

  {
    type: "MEASURE_PRICE",
    label: "Measure Price",
    minPoints: 2,
    maxPoints: 2,
  },
  {
    type: "MEASURE_TIME",
    label: "Measure Time",
    minPoints: 2,
    maxPoints: 2,
  },
  {
    type: "MEASURE_PRICE_TIME",
    label: "Measure Price + Time",
    minPoints: 2,
    maxPoints: 2,
  },
  {
    type: "MEASURE_RANGE",
    label: "Measure Range",
    minPoints: 2,
    maxPoints: 2,
  },
];

export function getDrawingTool(
  type: DrawingType,
): DrawingToolDefinition | undefined {
  return DRAWING_TOOL_DEFINITIONS.find(
    (tool) => tool.type === type,
  );
}
