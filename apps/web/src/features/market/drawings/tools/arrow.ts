import type { DrawingPoint } from "../types";

export const arrowTool = {
  type: "ARROW" as const,
  minPoints: 2,
  maxPoints: 2,

  isComplete(points: DrawingPoint[]): boolean {
    return points.length === 2;
  },
};
