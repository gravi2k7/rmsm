import type { DrawingPoint } from "../types";

export const trendLineTool = {
  type: "TREND_LINE" as const,
  minPoints: 2,
  maxPoints: 2,

  isComplete(points: DrawingPoint[]): boolean {
    return points.length === 2;
  },
};
