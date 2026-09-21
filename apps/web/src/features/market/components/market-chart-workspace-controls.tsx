"use client";

import {
  Columns3,
  LayoutDashboard,
  RotateCcw,
} from "lucide-react";

import { Button } from "@rmsm/ui";
import {
  MARKET_CHART_TOOLBAR_BUTTON_CLASS,
} from "./market-chart-toolbar-styles";

export type MarketChartLayout =
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
    value: "SPLIT",
    label: "Split",
    title: "Chart workspace",
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
            variant="ghost"
            className={MARKET_CHART_TOOLBAR_BUTTON_CLASS}
            data-active={active}
            aria-label={title}
            aria-pressed={active}
            title={title}
            onClick={() => onLayoutChange(value)}
          >
            <Icon
              className="h-4 w-4"
              aria-hidden="true"
            />
            <span className="sr-only">{label}</span>
          </Button>
        );
      })}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={MARKET_CHART_TOOLBAR_BUTTON_CLASS}
        aria-label="Reset chart workspace"
        title="Reset chart workspace"
        onClick={onResetWorkspace}
      >
        <RotateCcw
          className="h-4 w-4"
          aria-hidden="true"
        />
        <span className="sr-only">Reset</span>
      </Button>
    </div>
  );
}
