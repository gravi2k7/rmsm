import type { DrawingPoint, DrawingType } from "../types";

export interface AdvancedDrawingTool {
  type: DrawingType;
  minPoints: number;
  maxPoints: number;
  isComplete(points: DrawingPoint[]): boolean;
}

function tool(
  type: DrawingType,
  minPoints: number,
  maxPoints: number,
): AdvancedDrawingTool {
  return {
    type,
    minPoints,
    maxPoints,
    isComplete: (points) =>
      points.length >= minPoints &&
      points.length <= maxPoints,
  };
}

export const advancedDrawingTools: readonly AdvancedDrawingTool[] = [
  tool("PARALLEL_CHANNEL", 3, 3),
  tool("PRICE_CHANNEL", 3, 3),
  tool("REGRESSION_CHANNEL", 3, 3),


  tool("ABCD", 4, 4),
  tool("XABCD", 5, 5),
  tool("HEAD_SHOULDERS", 5, 5),
  tool("TRIANGLE", 4, 4),
  tool("WEDGE", 4, 4),

  tool("FORECAST", 2, 2),
  tool("PROJECTION", 2, 2),

  tool("MEASURE_PRICE", 2, 2),
  tool("MEASURE_TIME", 2, 2),
  tool("MEASURE_PRICE_TIME", 2, 2),
  tool("MEASURE_RANGE", 2, 2),
];
