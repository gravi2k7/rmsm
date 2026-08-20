"use client";

import { type ComponentType } from "react";

import {
  ArrowUpRight,
  ChevronDown,
  Minus,
  MoveUpRight,
  MoveVertical,
  MousePointer2,
  PenTool,
  Square,
  Type,
  TrendingUp,
} from "lucide-react";
import { Button } from "@rmsm/ui";
import { cn } from "@rmsm/ui";

import {
  DRAWING_TOOL_DEFINITIONS,
} from "@/features/market/drawings/registry";
import type { DrawingType } from "@/features/market/drawings/types";

interface MarketDrawingToolsMenuProps {
  activeDrawingTool: DrawingType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTool: (tool: DrawingType) => void;
}

const DRAWING_TOOL_ICONS: Record<
  DrawingType,
  ComponentType<{ className?: string }>
> = {
  SELECT: MousePointer2,
  TREND_LINE: TrendingUp,
  HORIZONTAL_LINE: Minus,
  VERTICAL_LINE: MoveVertical,
  RAY: MoveUpRight,
  RECTANGLE: Square,
  ARROW: ArrowUpRight,
  TEXT: Type,

  PARALLEL_CHANNEL: MoveUpRight,
  PRICE_CHANNEL: MoveVertical,
  REGRESSION_CHANNEL: TrendingUp,

  FIB_RETRACEMENT: PenTool,
  FIB_EXTENSION: PenTool,
  FIB_PROJECTION: PenTool,
  FIB_TIME: PenTool,

  ABCD: Square,
  XABCD: Square,
  HEAD_SHOULDERS: PenTool,
  TRIANGLE: Square,
  WEDGE: Square,

  FORECAST: TrendingUp,
  PROJECTION: ArrowUpRight,

  MEASURE_PRICE: Minus,
  MEASURE_TIME: MoveVertical,
  MEASURE_PRICE_TIME: MoveUpRight,
  MEASURE_RANGE: Square,
};

const GROUPS: Array<{
  label: string;
  types: DrawingType[];
}> = [
  {
    label: "Basic",
    types: [
      "SELECT",
      "TREND_LINE",
      "HORIZONTAL_LINE",
      "VERTICAL_LINE",
      "RAY",
      "RECTANGLE",
      "ARROW",
      "TEXT",
    ],
  },
  {
    label: "Channels",
    types: [
      "PARALLEL_CHANNEL",
      "PRICE_CHANNEL",
      "REGRESSION_CHANNEL",
    ],
  },
  {
    label: "Fibonacci",
    types: [
      "FIB_RETRACEMENT",
      "FIB_EXTENSION",
      "FIB_PROJECTION",
      "FIB_TIME",
    ],
  },
  {
    label: "Patterns",
    types: [
      "ABCD",
      "XABCD",
      "HEAD_SHOULDERS",
      "TRIANGLE",
      "WEDGE",
    ],
  },
  {
    label: "Projection",
    types: [
      "FORECAST",
      "PROJECTION",
    ],
  },
  {
    label: "Measure",
    types: [
      "MEASURE_PRICE",
      "MEASURE_TIME",
      "MEASURE_PRICE_TIME",
      "MEASURE_RANGE",
    ],
  },
];

function getDefinition(type: DrawingType) {
  return DRAWING_TOOL_DEFINITIONS.find(
    (definition) => definition.type === type,
  );
}

export function MarketDrawingToolsMenu({
  activeDrawingTool,
  open,
  onOpenChange,
  onSelectTool,
}: MarketDrawingToolsMenuProps) {
  const activeDefinition = getDefinition(activeDrawingTool);
  const ActiveIcon =
    DRAWING_TOOL_ICONS[activeDrawingTool] ?? PenTool;

  return (
    <div className="relative" role="group" aria-label="Drawing tools">
      <Button
        type="button"
        size="sm"
        variant={activeDrawingTool !== "SELECT" ? "default" : "ghost"}
        aria-label="Drawing tools"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Drawing tools"
        className="gap-1"
        onClick={() => onOpenChange(!open)}
      >
        <ActiveIcon className="h-4 w-4" />
        <span className="hidden sm:inline">
          {activeDefinition?.label ?? "Draw"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </Button>

      {open && (
        <div
          role="menu"
          aria-label="Drawing tools"
          className={cn(
            "absolute left-0 top-full z-50 mt-2",
            "w-[320px] max-w-[min(320px,calc(100vw-2rem))] rounded-lg border bg-popover p-2",
            "shadow-xl",
          )}
        >
          <div className="mb-2 flex items-center gap-2 border-b px-2 pb-2">
            <PenTool className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-semibold">
                Drawing Tools
              </div>
              <div className="text-[11px] text-muted-foreground">
                Select a tool to draw on the chart
              </div>
            </div>
          </div>

          <div className="max-h-[min(70vh,520px)] overflow-y-auto pr-1">
            {GROUPS.map((group) => {
              const tools = group.types
                .map(getDefinition)
                .filter(
                  (
                    definition,
                  ): definition is NonNullable<
                    ReturnType<typeof getDefinition>
                  > => Boolean(definition),
                );

              if (tools.length === 0) {
                return null;
              }

              return (
                <section
                  key={group.label}
                  aria-label={group.label}
                  className="mb-3 last:mb-0"
                >
                  <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    {tools.map((tool) => {
                      const Icon =
                        DRAWING_TOOL_ICONS[tool.type] ?? PenTool;
                      const active =
                        tool.type === activeDrawingTool;

                      return (
                        <button
                          key={tool.type}
                          type="button"
                          role="menuitem"
                          aria-current={active ? "true" : undefined}
                          title={tool.label}
                          className={cn(
                            "flex min-h-9 items-center gap-2 rounded-md",
                            "px-2 text-left text-xs transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            active &&
                              "bg-accent text-accent-foreground",
                          )}
                          onClick={() => {
                            onSelectTool(tool.type);
                            onOpenChange(false);
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {tool.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
