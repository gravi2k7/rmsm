"use client";

import { useMemo } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";

import { Button } from "@rmsm/ui";
import {
  DRAWING_TOOL_DEFINITIONS,
} from "../drawings/registry";
import type {
  Drawing,
  DrawingState,
} from "../drawings/types";

interface MarketDrawingObjectManagerProps {
  state: DrawingState;
  onSelect: (id: string | null) => void;
  onVisibilityChange: (id: string, visible: boolean) => void;
  onLockChange: (id: string, locked: boolean) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onDeleteAll: () => void;
  onClose: () => void;
}

function getDrawingLabel(drawing: Drawing): string {
  if (drawing.type === "TEXT") {
    const textDrawing = drawing as Extract<
      Drawing,
      { type: "TEXT" }
    >;

    return textDrawing.text || "Text";
  }

  return (
    DRAWING_TOOL_DEFINITIONS.find(
      (tool) => tool.type === drawing.type,
    )?.label ?? drawing.type
  );
}

function ObjectRow({
  drawing,
  selected,
  onSelect,
  onVisibilityChange,
  onLockChange,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}: {
  drawing: Drawing;
  selected: boolean;
  onSelect: (id: string) => void;
  onVisibilityChange: (id: string, visible: boolean) => void;
  onLockChange: (id: string, locked: boolean) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}) {
  return (
    <div
      className={[
        "flex items-center gap-1 rounded-md border px-1 py-1",
        selected
          ? "border-primary bg-primary/10"
          : "border-transparent",
      ].join(" ")}
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="min-w-0 flex-1 justify-start truncate px-2"
        aria-label={`Select ${getDrawingLabel(drawing)}`}
        aria-pressed={selected}
        onClick={() => onSelect(drawing.id)}
      >
        <span className="truncate">
          {getDrawingLabel(drawing)}
        </span>
      </Button>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        aria-label={
          drawing.visible
            ? `Hide ${getDrawingLabel(drawing)}`
            : `Show ${getDrawingLabel(drawing)}`
        }
        onClick={() =>
          onVisibilityChange(
            drawing.id,
            !drawing.visible,
          )
        }
      >
        {drawing.visible ? (
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </Button>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        aria-label={
          drawing.locked
            ? `Unlock ${getDrawingLabel(drawing)}`
            : `Lock ${getDrawingLabel(drawing)}`
        }
        onClick={() =>
          onLockChange(
            drawing.id,
            !drawing.locked,
          )
        }
      >
        {drawing.locked ? (
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </Button>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        aria-label={`Duplicate ${getDrawingLabel(drawing)}`}
        disabled={drawing.locked}
        onClick={() => onDuplicate(drawing.id)}
      >
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        aria-label={`Delete ${getDrawingLabel(drawing)}`}
        disabled={drawing.locked}
        onClick={() => onDelete(drawing.id)}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>

      <div className="hidden items-center sm:flex">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label={`Bring ${getDrawingLabel(drawing)} to front`}
          disabled={drawing.locked}
          onClick={() => onBringToFront(drawing.id)}
        >
          <ChevronsUp className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label={`Bring ${getDrawingLabel(drawing)} forward`}
          disabled={drawing.locked}
          onClick={() => onBringForward(drawing.id)}
        >
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label={`Send ${getDrawingLabel(drawing)} backward`}
          disabled={drawing.locked}
          onClick={() => onSendBackward(drawing.id)}
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label={`Send ${getDrawingLabel(drawing)} to back`}
          disabled={drawing.locked}
          onClick={() => onSendToBack(drawing.id)}
        >
          <ChevronsDown className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function MarketDrawingObjectManager({
  state,
  onSelect,
  onVisibilityChange,
  onLockChange,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onShowAll,
  onHideAll,
  onDeleteAll,
  onClose,
}: MarketDrawingObjectManagerProps) {
  const drawings = useMemo(
    () =>
      [...state.drawings].sort(
        (a, b) => b.zIndex - a.zIndex,
      ),
    [state.drawings],
  );

  return (
    <div
      className="w-[min(420px,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-lg border bg-popover p-2 shadow-xl"
      role="region"
      aria-label="Chart objects"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            Chart Objects
          </div>
          <div className="text-xs text-muted-foreground">
            {drawings.length} object{drawings.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onShowAll}
          >
            Show all
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onHideAll}
          >
            Hide all
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={drawings.length === 0}
            onClick={onDeleteAll}
          >
            Delete all
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            aria-label="Close objects panel"
            title="Close objects panel"
            onClick={onClose}
          >
            <X
              className="h-4 w-4"
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      {drawings.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No drawings on this chart.
        </div>
      ) : (
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {drawings.map((drawing) => (
            <ObjectRow
              key={drawing.id}
              drawing={drawing}
              selected={
                state.selectedDrawingId === drawing.id
              }
              onSelect={onSelect}
              onVisibilityChange={onVisibilityChange}
              onLockChange={onLockChange}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onBringForward={onBringForward}
              onSendBackward={onSendBackward}
              onBringToFront={onBringToFront}
              onSendToBack={onSendToBack}
            />
          ))}
        </div>
      )}
    </div>
  );
}
