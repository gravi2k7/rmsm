import type { Drawing } from "../types";

export const selectTool = {
  type: "SELECT" as const,
  minPoints: 0,
  maxPoints: 0,

  hit(drawing: Drawing): boolean {
    return drawing.visible;
  },
};
