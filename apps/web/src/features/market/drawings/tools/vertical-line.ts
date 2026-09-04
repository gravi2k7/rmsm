import type { DrawingPoint } from "../types";

export const verticalLineTool = {
  type: "VERTICAL_LINE" as const,
  minPoints: 1,
  maxPoints: 1,

  isComplete(points: DrawingPoint[]): boolean {
    return points.length === 1;
  },
};
