"use client";

import { type ComponentType } from "react";

import {
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDot,
  Crosshair,
  DraftingCompass,
  GitBranch,
  Minus,
  MoveUpRight,
  MoveVertical,
  MousePointer2,
  PenTool,
  Ruler,
  Square,
  Triangle,
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

  PARALLEL_CHANNEL: GitBranch,
  PRICE_CHANNEL: DraftingCompass,
  REGRESSION_CHANNEL: ChartNoAxesCombined,

  FIB_RETRACEMENT: PenTool,
  FIB_EXTENSION: Crosshair,
  FIB_PROJECTION: MoveUpRight,
  FIB_TIME: CircleDot,

  ABCD: GitBranch,
  XABCD: Crosshair,
  HEAD_SHOULDERS: ChartNoAxesCombined,
  TRIANGLE: Triangle,
  WEDGE: DraftingCompass,

  FORECAST: TrendingUp,
  PROJECTION: ArrowUpRight,

  MEASURE_PRICE: Ruler,
  MEASURE_TIME: MoveVertical,
  MEASURE_PRICE_TIME: MoveUpRight,
  MEASURE_RANGE: Ruler,
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
        className={cn(
          "gap-1.5",
          open && "bg-accent text-accent-foreground",
        )}
        onClick={() => onOpenChange(!open)}
      >
        <ActiveIcon className="h-4 w-4" />
        <span className="hidden sm:inline">
          {activeDrawingTool === "SELECT"
            ? "Draw"
            : activeDefinition?.label ?? "Draw"}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 opacity-70 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </Button>

      {open && (
        <div
          role="menu"
          aria-label="Drawing tools"
          className={cn(
            "absolute left-0 top-full z-50 mt-1 sm:mt-2",
            "w-[280px] max-w-[calc(100vw-1rem)]",
            "sm:w-[320px] sm:max-w-[min(320px,calc(100vw-2rem))]",
            "rounded-lg border bg-popover p-1.5 sm:p-2 shadow-xl",
            "origin-top-left",
          )}
        >
          <div className="mb-1.5 flex items-center justify-between gap-2 border-b px-1.5 pb-1.5 sm:mb-2 sm:px-2 sm:pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <PenTool className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
              <div className="min-w-0">
                <div className="text-xs font-semibold sm:text-sm">
                  Drawing Tools
                </div>
                <div className="hidden text-[11px] text-muted-foreground sm:block">
                  Select a tool to draw on the chart
                </div>
              </div>
            </div>

            <span className="shrink-0 text-[9px] text-muted-foreground sm:text-[10px]">
              {activeDefinition?.label ?? "Select"}
            </span>
          </div>

          <div className="max-h-[min(72vh,460px)] overflow-y-auto pr-0.5 sm:max-h-[min(70vh,520px)] sm:pr-1">
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
                  className="mb-2 last:mb-0 sm:mb-3"
                >
                  <div className="px-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-2 sm:pb-1 sm:text-[10px]">
                    {group.label}
                  </div>

                  <div className="grid grid-cols-2 gap-0.5 sm:gap-1">
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
                            "flex min-h-8 items-center gap-1.5 rounded-md",
                            "px-1.5 text-left text-[11px] transition-colors",
                            "sm:min-h-9 sm:gap-2 sm:px-2 sm:text-xs",
                            "hover:bg-accent hover:text-accent-foreground",
                            active &&
                              "bg-accent text-accent-foreground",
                          )}
                          onClick={() => {
                            onSelectTool(tool.type);
                            onOpenChange(false);
                          }}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
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
