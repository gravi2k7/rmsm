"use client";

import { useEffect, useState, type ComponentType, type CSSProperties } from "react";

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
  Circle,
  MessageSquare,
  Star,
  Tag,
  CandlestickChart,
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
import {
  getFavoriteDrawingTools,
  setFavoriteDrawingTools,
} from "@/features/market/drawings/favorites";
import { drawingToolPalette } from "@/features/market/drawings/palette";

interface MarketDrawingToolsMenuProps {
  activeDrawingTool: DrawingType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTool: (tool: DrawingType) => void;
}

const DRAWING_TOOL_ICONS: Record<
  DrawingType,
  ComponentType<{
    className?: string;
    style?: CSSProperties;
  }>
> = {
  SELECT: MousePointer2,
  TREND_LINE: TrendingUp,
  HORIZONTAL_LINE: Minus,
  VERTICAL_LINE: MoveVertical,
  RAY: MoveUpRight,
  EXTENDED_LINE: MoveUpRight,
  CROSS_LINE: Crosshair,
  RECTANGLE: Square,
  CIRCLE: Circle,
  POLYLINE: PenTool,
  ARROW: ArrowUpRight,
  TEXT: Type,
  NOTE: MessageSquare,
  CALLOUT: MessageSquare,
  PRICE_LABEL: Tag,

  PARALLEL_CHANNEL: GitBranch,
  PRICE_CHANNEL: DraftingCompass,
  REGRESSION_CHANNEL: ChartNoAxesCombined,

  FIB_RETRACEMENT: PenTool,
  FIB_EXTENSION: Crosshair,
  FIB_PROJECTION: MoveUpRight,
  FIB_TIME: CircleDot,
  FIB_CHANNEL: GitBranch,

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
  LONG_POSITION: CandlestickChart,
  SHORT_POSITION: CandlestickChart,
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
  icon: ComponentType<{
    className?: string;
    style?: CSSProperties;
  }>;
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
      "EXTENDED_LINE",
      "CROSS_LINE",
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
      "FIB_CHANNEL",
    ],
  },
  {
    id: "shapes",
    label: "Shapes",
    icon: Square,
    types: [
      "RECTANGLE",
      "CIRCLE",
      "TRIANGLE",
      "WEDGE",
      "POLYLINE",
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
      "LONG_POSITION",
      "SHORT_POSITION",
    ],
  },
  {
    id: "text",
    label: "Text",
    icon: Type,
    types: [
      "TEXT",
      "NOTE",
      "CALLOUT",
      "PRICE_LABEL",
    ],
  },
];

function getDefinition(type: DrawingType) {
  return DRAWING_TOOL_DEFINITIONS.find(
    (definition) => definition.type === type,
  );
}

export function ToolIcon({
  type,
  className,
}: {
  type: DrawingType;
  className?: string;
}) {
  const Icon = DRAWING_TOOL_ICONS[type] ?? PenTool;
  const palette = drawingToolPalette(type);

  return (
    <Icon
      className={className}
      style={{ color: palette.color }}
      aria-hidden="true"
    />
  );
}

export function MarketDrawingToolsMenu({
  activeDrawingTool,
  open,
  onOpenChange,
  onSelectTool,
}: MarketDrawingToolsMenuProps) {
  const [favoriteTools, setFavoriteTools] = useState<DrawingType[]>([]);

  useEffect(() => {
    setFavoriteTools(getFavoriteDrawingTools());
  }, []);

  const activeDefinition = getDefinition(activeDrawingTool);
  const ActiveIcon =
    DRAWING_TOOL_ICONS[activeDrawingTool] ?? PenTool;

  const selectTool = (tool: DrawingType) => {
    onSelectTool(tool);
    onOpenChange(false);
  };

  const toggleFavorite = (
    event: React.MouseEvent,
    tool: DrawingType,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setFavoriteTools((current) => {
      const next = current.includes(tool)
        ? current.filter((item) => item !== tool)
        : [...current, tool];

      setFavoriteDrawingTools(next);

      return next;
    });
  };

  const favoriteDefinitions = favoriteTools
    .map(getDefinition)
    .filter(
      (
        definition,
      ): definition is NonNullable<
        ReturnType<typeof getDefinition>
      > => Boolean(definition),
    );

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
            <ActiveIcon
              className="h-4 w-4"
              style={{
                color: drawingToolPalette(activeDrawingTool).color,
              }}
            />
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
              style={{
                color: drawingToolPalette("SELECT").color,
              }}
              aria-hidden="true"
            />
            <span>Select</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Esc
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="px-2 py-1.5 text-xs">
            ⭐ Favourite Tools
          </DropdownMenuLabel>

          {favoriteDefinitions.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Star tools below to add them here.
            </div>
          ) : (
            favoriteDefinitions.map((tool) => (
              <DropdownMenuItem
                key={`favorite-${tool.type}`}
                onSelect={() => selectTool(tool.type)}
                className={cn(
                  "min-h-8",
                  activeDrawingTool === tool.type &&
                    "bg-accent text-accent-foreground",
                )}
              >
                <ToolIcon
                  type={tool.type}
                  className="mr-2 h-4 w-4"
                />
                <span className="truncate">{tool.label}</span>

                <button
                  type="button"
                  aria-label={`Remove ${tool.label} from favourites`}
                  title="Remove from favourites"
                  className="ml-auto rounded p-1 text-foreground/70 hover:bg-accent hover:text-foreground"
                  onClick={(event) =>
                    toggleFavorite(event, tool.type)
                  }
                >
                  <Star className="h-3.5 w-3.5 fill-current" />
                </button>
              </DropdownMenuItem>
            ))
          )}

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
                      style={{
                        color: drawingToolPalette(
                          group.types[0] ?? "SELECT",
                        ).color,
                      }}
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
                    className="w-64"
                  >
                    <DropdownMenuLabel className="text-xs">
                      {group.label}
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    {tools.map((tool) => {
                      const active =
                        tool.type === activeDrawingTool;
                      const favorite =
                        favoriteTools.includes(tool.type);

                      return (
                        <div
                          key={tool.type}
                          className={cn(
                            "flex min-h-8 items-center rounded-md",
                            active &&
                              "bg-accent text-accent-foreground",
                          )}
                        >
                          <DropdownMenuItem
                            onSelect={() => selectTool(tool.type)}
                            className="min-h-8 flex-1 rounded-r-none"
                          >
                            <ToolIcon
                              type={tool.type}
                              className="mr-2 h-4 w-4"
                            />

                            <span className="truncate">
                              {tool.label}
                            </span>

                            {active && (
                              <span className="ml-auto mr-1 text-xs">
                                ✓
                              </span>
                            )}
                          </DropdownMenuItem>

                          <button
                            type="button"
                            aria-label={
                              favorite
                                ? `Remove ${tool.label} from favourites`
                                : `Add ${tool.label} to favourites`
                            }
                            title={
                              favorite
                                ? "Remove from favourites"
                                : "Add to favourites"
                            }
                            className={cn(
                              "mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded",
                              "text-foreground/60",
                              "hover:bg-accent hover:text-foreground",
                              favorite &&
                                "text-foreground",
                            )}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onClick={(event) =>
                              toggleFavorite(event, tool.type)
                            }
                          >
                            <Star
                              className="h-3.5 w-3.5"
                              fill={
                                favorite
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </button>
                        </div>
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
