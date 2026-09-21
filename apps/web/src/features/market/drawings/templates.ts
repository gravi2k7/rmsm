import {
  DRAWING_TOOL_DEFINITIONS,
} from "./registry";
import type {
  DrawingStyle,
  DrawingType,
} from "./types";

const STORAGE_KEY = "rmsm.market.drawing-templates";

export const TEMPLATES_CHANGED_EVENT =
  "rmsm.market.drawing-templates.changed";

export interface DrawingTemplate {
  id: string;
  name: string;
  type: DrawingType;
  style: DrawingStyle;
  content?: {
    text?: string;
    fontSize?: number;
  };
  createdAt: number;
  updatedAt: number;
}

function isDrawingType(
  value: unknown,
): value is DrawingType {
  return (
    typeof value === "string" &&
    DRAWING_TOOL_DEFINITIONS.some(
      (definition) => definition.type === value,
    )
  );
}

function isDrawingStyle(
  value: unknown,
): value is DrawingStyle {
  if (!value || typeof value !== "object") {
    return false;
  }

  const style = value as Partial<DrawingStyle>;

  return (
    typeof style.color === "string" &&
    typeof style.width === "number" &&
    (style.lineStyle === "solid" ||
      style.lineStyle === "dashed" ||
      style.lineStyle === "dotted") &&
    typeof style.opacity === "number"
  );
}

function readTemplates(): DrawingTemplate[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(
      STORAGE_KEY,
    );

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is DrawingTemplate => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const template =
        item as Partial<DrawingTemplate>;

      return (
        typeof template.id === "string" &&
        typeof template.name === "string" &&
        isDrawingType(template.type) &&
        isDrawingStyle(template.style) &&
        typeof template.createdAt === "number" &&
        typeof template.updatedAt === "number"
      );
    });
  } catch {
    return [];
  }
}

function writeTemplates(
  templates: DrawingTemplate[],
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(templates),
  );

  window.dispatchEvent(
    new CustomEvent(TEMPLATES_CHANGED_EVENT),
  );
}

export function getDrawingTemplates(): DrawingTemplate[] {
  return readTemplates();
}

export function saveDrawingTemplate(
  name: string,
  type: DrawingType,
  style: DrawingStyle,
  content?: {
    text?: string;
    fontSize?: number;
  },
): DrawingTemplate {
  const now = Date.now();

  const template: DrawingTemplate = {
    id: `drawing-template-${now}-${Math.random()
      .toString(36)
      .slice(2, 10)}`,
    name: name.trim(),
    type,
    style: {
      ...style,
    },
    ...(content
      ? {
          content: {
            ...content,
          },
        }
      : {}),
    createdAt: now,
    updatedAt: now,
  };

  if (!template.name) {
    throw new Error("Template name is required.");
  }

  const templates = readTemplates();

  writeTemplates([
    ...templates,
    template,
  ]);

  return template;
}

export function deleteDrawingTemplate(
  id: string,
): void {
  const templates = readTemplates();

  writeTemplates(
    templates.filter(
      (template) => template.id !== id,
    ),
  );
}
