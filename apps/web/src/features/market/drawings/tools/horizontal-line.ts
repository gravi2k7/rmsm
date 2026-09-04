import type { DrawingPoint } from "../types";

export const horizontalLineTool = {
  type: "HORIZONTAL_LINE" as const,
  minPoints: 1,
  maxPoints: 1,

  isComplete(points: DrawingPoint[]): boolean {
    return points.length === 1;
  },
};
