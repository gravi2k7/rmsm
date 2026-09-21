"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { GripVertical } from "lucide-react";

import { cn } from "@rmsm/ui";

import {
  DRAWING_TOOL_DEFINITIONS,
} from "@/features/market/drawings/registry";
import {
  FAVORITES_CHANGED_EVENT,
  getFavoriteDrawingTools,
} from "@/features/market/drawings/favorites";
import type { DrawingType } from "@/features/market/drawings/types";
import {
  ToolIcon,
} from "./market-drawing-tools-menu";

const POSITION_STORAGE_KEY =
  "rmsm.market.drawing-favorites-toolbar-position";

interface ToolbarPosition {
  x: number;
  y: number;
}

const DEFAULT_POSITION: ToolbarPosition = {
  x: 16,
  y: 12,
};

function getStoredPosition(): ToolbarPosition {
  if (typeof window === "undefined") {
    return DEFAULT_POSITION;
  }

  try {
    const raw = window.localStorage.getItem(
      POSITION_STORAGE_KEY,
    );

    if (!raw) {
      return DEFAULT_POSITION;
    }

    const parsed = JSON.parse(raw);

    if (
      typeof parsed?.x !== "number" ||
      typeof parsed?.y !== "number"
    ) {
      return DEFAULT_POSITION;
    }

    return {
      x: parsed.x,
      y: parsed.y,
    };
  } catch {
    return DEFAULT_POSITION;
  }
}

function savePosition(position: ToolbarPosition) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    POSITION_STORAGE_KEY,
    JSON.stringify(position),
  );
}

function getToolLabel(type: DrawingType) {
  return (
    DRAWING_TOOL_DEFINITIONS.find(
      (definition) => definition.type === type,
    )?.label ?? type
  );
}

export function MarketFavoriteToolsToolbar({
  activeDrawingTool,
  onSelectTool,
}: {
  activeDrawingTool: DrawingType;
  onSelectTool: (tool: DrawingType) => void;
}) {
  const [favoriteTools, setFavoriteTools] = useState<
    DrawingType[]
  >([]);

  const [position, setPosition] =
    useState<ToolbarPosition>(DEFAULT_POSITION);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    setFavoriteTools(getFavoriteDrawingTools());
    setPosition(getStoredPosition());

    const handleFavoritesChanged = () => {
      setFavoriteTools(getFavoriteDrawingTools());
    };

    window.addEventListener(
      FAVORITES_CHANGED_EVENT,
      handleFavoritesChanged,
    );

    return () => {
      window.removeEventListener(
        FAVORITES_CHANGED_EVENT,
        handleFavoritesChanged,
      );
    };
  }, []);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!toolbarRef.current) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;

    if (!target.closest("[data-favorite-toolbar-drag]")) {
      return;
    }

    const rect = toolbarRef.current.getBoundingClientRect();

    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const parent =
      toolbarRef.current?.parentElement;

    if (!parent || !toolbarRef.current) {
      return;
    }

    const parentRect = parent.getBoundingClientRect();
    const toolbarRect =
      toolbarRef.current.getBoundingClientRect();

    const maxX = Math.max(
      0,
      parentRect.width - toolbarRect.width,
    );

    const maxY = Math.max(
      0,
      parentRect.height - toolbarRect.height,
    );

    const nextX = Math.min(
      maxX,
      Math.max(
        0,
        event.clientX -
          parentRect.left -
          drag.offsetX,
      ),
    );

    const nextY = Math.min(
      maxY,
      Math.max(
        0,
        event.clientY -
          parentRect.top -
          drag.offsetY,
      ),
    );

    setPosition({
      x: nextX,
      y: nextY,
    });
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    savePosition(position);

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }
  };

  useEffect(() => {
    if (!dragRef.current) {
      return;
    }

    savePosition(position);
  }, [position]);

  /*
   * Important:
   * No favourites = no toolbar at all.
   */
  if (favoriteTools.length === 0) {
    return null;
  }

  return (
    <div
      ref={toolbarRef}
      data-testid="market-favorite-tools-toolbar"
      className="absolute z-[60] flex items-center gap-0.5 rounded-md border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur"
      style={{
        left: position.x,
        top: position.y,
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        data-favorite-toolbar-drag
        className="flex h-7 w-6 cursor-grab items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground active:cursor-grabbing"
        title="Drag favourite tools"
        aria-label="Drag favourite tools"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      <div className="mx-0.5 h-5 w-px bg-border/70" />

      {favoriteTools.map((tool) => {
        const active = activeDrawingTool === tool;

        return (
          <button
            key={tool}
            type="button"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-sm",
              "transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              active &&
                "bg-accent text-accent-foreground",
            )}
            title={getToolLabel(tool)}
            aria-label={getToolLabel(tool)}
            aria-pressed={active}
            onClick={() => onSelectTool(tool)}
          >
            <ToolIcon
              type={tool}
              className="h-4 w-4"
            />
          </button>
        );
      })}
    </div>
  );
}
