import type { DrawingType } from "./types";
import { DRAWING_TOOL_DEFINITIONS } from "./registry";

const STORAGE_KEY = "rmsm.market.drawing-favorites";
export const FAVORITES_CHANGED_EVENT =
  "rmsm.market.drawing-favorites.changed";

const DEFAULT_FAVORITES: DrawingType[] = [];

function isDrawingType(value: unknown): value is DrawingType {
  return (
    typeof value === "string" &&
    DRAWING_TOOL_DEFINITIONS.some(
      (definition) => definition.type === value,
    )
  );
}

export function getFavoriteDrawingTools(): DrawingType[] {
  if (typeof window === "undefined") {
    return DEFAULT_FAVORITES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_FAVORITES;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return DEFAULT_FAVORITES;
    }

    return Array.from(
      new Set(parsed.filter(isDrawingType)),
    );
  } catch {
    return DEFAULT_FAVORITES;
  }
}

export function setFavoriteDrawingTools(
  tools: DrawingType[],
): void {
  if (typeof window === "undefined") {
    return;
  }

  const validTools = Array.from(
    new Set(tools.filter(isDrawingType)),
  );

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(validTools),
  );

  window.dispatchEvent(
    new CustomEvent(FAVORITES_CHANGED_EVENT),
  );
}

export function toggleFavoriteDrawingTool(
  tool: DrawingType,
): DrawingType[] {
  const current = getFavoriteDrawingTools();

  const next = current.includes(tool)
    ? current.filter((item) => item !== tool)
    : [...current, tool];

  setFavoriteDrawingTools(next);

  return next;
}
