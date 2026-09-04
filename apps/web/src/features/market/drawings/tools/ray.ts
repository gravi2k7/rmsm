import type { DrawingPoint } from "../types";

export const rayTool = {
  type: "RAY" as const,
  minPoints: 2,
  maxPoints: 2,

  isComplete(points: DrawingPoint[]): boolean {
    return points.length === 2;
  },
};
