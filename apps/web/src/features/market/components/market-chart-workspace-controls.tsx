"use client";

import {
  Columns3,
  LayoutDashboard,
  RotateCcw,
  Rows3,
} from "lucide-react";

import { Button } from "@rmsm/ui";

export type MarketChartLayout =
  | "CHART_ONLY"
  | "CHART_WITH_PANES"
  | "SPLIT";

interface MarketChartWorkspaceControlsProps {
  layout: MarketChartLayout;
  onLayoutChange: (layout: MarketChartLayout) => void;
  onResetWorkspace: () => void;
}

const LAYOUTS: Array<{
  value: MarketChartLayout;
  label: string;
  title: string;
  Icon: typeof LayoutDashboard;
}> = [
  {
    value: "CHART_ONLY",
    label: "Chart",
    title: "Chart only",
    Icon: LayoutDashboard,
  },
  {
    value: "CHART_WITH_PANES",
    label: "Panes",
    title: "Chart with indicator panes",
    Icon: Rows3,
  },
  {
    value: "SPLIT",
    label: "Split",
    title: "Split chart workspace",
    Icon: Columns3,
  },
];

export function MarketChartWorkspaceControls({
  layout,
  onLayoutChange,
  onResetWorkspace,
}: MarketChartWorkspaceControlsProps) {
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Chart workspace layout"
    >
      {LAYOUTS.map(({ value, label, title, Icon }) => {
        const active = layout === value;

        return (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={active ? "default" : "ghost"}
            aria-label={title}
            aria-pressed={active}
            title={title}
            onClick={() => onLayoutChange(value)}
          >
            <Icon
              className="mr-1 h-4 w-4"
              aria-hidden="true"
            />
            <span className="hidden md:inline">{label}</span>
          </Button>
        );
      })}

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label="Reset chart workspace"
        title="Reset chart workspace"
        onClick={onResetWorkspace}
      >
        <RotateCcw
          className="h-4 w-4"
          aria-hidden="true"
        />
      </Button>
    </div>
  );
}
