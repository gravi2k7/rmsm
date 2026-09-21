import type { DrawingPoint } from "../types";

export const textTool = {
  type: "TEXT" as const,
  minPoints: 1,
  maxPoints: 1,

  isComplete(points: DrawingPoint[]): boolean {
    return points.length === 1;
  },
};
