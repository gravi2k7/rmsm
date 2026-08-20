"use client";

import {
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Scaling,
  BarChart3,
} from "lucide-react";

import { Button } from "@rmsm/ui";

interface MarketChartViewControlsProps {
  volumeVisible: boolean;
  onFitContent: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onAutoScale: () => void;
  onToggleVolume: () => void;
}

export function MarketChartViewControls({
  volumeVisible,
  onFitContent,
  onResetView,
  onZoomIn,
  onZoomOut,
  onAutoScale,
  onToggleVolume,
}: MarketChartViewControlsProps) {
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Chart view controls"
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label="Zoom in"
        title="Zoom in"
        onClick={onZoomIn}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label="Zoom out"
        title="Zoom out"
        onClick={onZoomOut}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label="Fit chart"
        title="Fit chart"
        onClick={onFitContent}
      >
        <Maximize2 className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label="Reset chart view"
        title="Reset chart view"
        onClick={onResetView}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label="Auto scale price"
        title="Auto scale price"
        onClick={onAutoScale}
      >
        <Scaling className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Button
        type="button"
        size="icon"
        variant={volumeVisible ? "default" : "ghost"}
        className="h-8 w-8"
        aria-label={volumeVisible ? "Hide volume" : "Show volume"}
        aria-pressed={volumeVisible}
        title={volumeVisible ? "Hide volume" : "Show volume"}
        onClick={onToggleVolume}
      >
        <BarChart3 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
