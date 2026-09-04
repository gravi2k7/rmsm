"use client";

import { type ComponentType } from "react";

import {
  ArrowUpRight,
  ChartNoAxesCombined,
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
  ChevronRight,
} from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  cn,
} from "@rmsm/ui";

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

interface DrawingToolGroup {
  id:
    | "lines"
    | "channels"
    | "fibonacci"
    | "shapes"
    | "patterns"
    | "forecast"
    | "measurement"
    | "text";
  label: string;
  icon: ComponentType<{ className?: string }>;
  types: DrawingType[];
}

const GROUPS: readonly DrawingToolGroup[] = [
  {
    id: "lines",
    label: "Lines",
    icon: TrendingUp,
    types: [
      "TREND_LINE",
      "HORIZONTAL_LINE",
      "VERTICAL_LINE",
      "RAY",
      "ARROW",
    ],
  },
  {
    id: "channels",
    label: "Channels",
    icon: GitBranch,
    types: [
      "PARALLEL_CHANNEL",
      "PRICE_CHANNEL",
      "REGRESSION_CHANNEL",
    ],
  },
  {
    id: "fibonacci",
    label: "Fibonacci",
    icon: Crosshair,
    types: [
      "FIB_RETRACEMENT",
      "FIB_EXTENSION",
      "FIB_PROJECTION",
      "FIB_TIME",
    ],
  },
  {
    id: "shapes",
    label: "Shapes",
    icon: Square,
    types: [
      "RECTANGLE",
      "TRIANGLE",
      "WEDGE",
    ],
  },
  {
    id: "patterns",
    label: "Patterns",
    icon: Triangle,
    types: [
      "ABCD",
      "XABCD",
      "HEAD_SHOULDERS",
    ],
  },
  {
    id: "forecast",
    label: "Forecast / Projection",
    icon: ChartNoAxesCombined,
    types: [
      "FORECAST",
      "PROJECTION",
    ],
  },
  {
    id: "measurement",
    label: "Measurement",
    icon: Ruler,
    types: [
      "MEASURE_PRICE",
      "MEASURE_TIME",
      "MEASURE_PRICE_TIME",
      "MEASURE_RANGE",
    ],
  },
  {
    id: "text",
    label: "Text",
    icon: Type,
    types: [
      "TEXT",
    ],
  },
];

function getDefinition(type: DrawingType) {
  return DRAWING_TOOL_DEFINITIONS.find(
    (definition) => definition.type === type,
  );
}

function ToolIcon({
  type,
  className,
}: {
  type: DrawingType;
  className?: string;
}) {
  const Icon = DRAWING_TOOL_ICONS[type] ?? PenTool;

  return <Icon className={className} aria-hidden="true" />;
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

  const selectTool = (tool: DrawingType) => {
    onSelectTool(tool);
    onOpenChange(false);
  };

  return (
    <div className="flex items-center">
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant={
              activeDrawingTool !== "SELECT" ? "default" : "ghost"
            }
            aria-label={
              activeDrawingTool === "SELECT"
                ? "Drawing tools"
                : activeDefinition?.label ?? "Drawing tools"
            }
            title={
              activeDrawingTool === "SELECT"
                ? "Drawing tools"
                : activeDefinition?.label ?? "Drawing tools"
            }
            className={cn(
              "h-8 w-8 shrink-0 rounded-md",
              open && "bg-accent text-accent-foreground",
            )}
          >
            <ActiveIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="w-72 p-1"
        >
          <DropdownMenuLabel className="px-2 py-1.5 text-xs">
            Drawing Tools
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => selectTool("SELECT")}
            className={cn(
              "min-h-8",
              activeDrawingTool === "SELECT" &&
                "bg-accent text-accent-foreground",
            )}
          >
            <MousePointer2
              className="mr-2 h-4 w-4"
              aria-hidden="true"
            />
            <span>Select</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Esc
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <div className="grid grid-cols-2 gap-1">
            {GROUPS.map((group) => {
              const GroupIcon = group.icon;

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

              const groupHasActiveTool =
                group.types.includes(activeDrawingTool);

              return (
                <DropdownMenuSub key={group.id}>
                  <DropdownMenuSubTrigger
                    className={cn(
                      "min-h-10 rounded-md px-2",
                      groupHasActiveTool &&
                        "bg-accent text-accent-foreground",
                    )}
                  >
                    <GroupIcon
                      className="mr-2 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {group.label}
                    </span>
                    <ChevronRight
                      className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50"
                      aria-hidden="true"
                    />
                  </DropdownMenuSubTrigger>

                  <DropdownMenuSubContent
                    sideOffset={6}
                    className="w-60"
                  >
                    <DropdownMenuLabel className="text-xs">
                      {group.label}
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    {tools.map((tool) => {
                      const active =
                        tool.type === activeDrawingTool;

                      return (
                        <DropdownMenuItem
                          key={tool.type}
                          onSelect={() => selectTool(tool.type)}
                          className={cn(
                            "min-h-8",
                            active &&
                              "bg-accent text-accent-foreground",
                          )}
                        >
                          <ToolIcon
                            type={tool.type}
                            className="mr-2 h-4 w-4"
                          />
                          <span>{tool.label}</span>
                          {active && (
                            <span className="ml-auto text-xs">
                              ✓
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
