import type { DrawingPoint } from "../types";

export const rectangleTool = {
  type: "RECTANGLE" as const,
  minPoints: 2,
  maxPoints: 2,

  isComplete(points: DrawingPoint[]): boolean {
    return points.length === 2;
  },
};
