"use client";

import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";

import { Button } from "@rmsm/ui";

interface MarketChartViewControlsProps {
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onScrollLeft: () => void;
  onScrollRight: () => void;
  hidden?: boolean;
  dark?: boolean;
}

export function MarketChartViewControls({
  onResetView,
  onZoomIn,
  onZoomOut,
  onScrollLeft,
  onScrollRight,
  hidden = false,
  dark = false,
}: MarketChartViewControlsProps) {
  return (
    <div
      className={[
        "absolute bottom-10 left-1/2 z-40 -translate-x-1/2 rounded-lg border p-1 shadow-lg backdrop-blur transition-opacity duration-150",
        dark
          ? "border-slate-700 bg-[#0b1220]/95 text-slate-200"
          : "bg-background/90",
        hidden
          ? "pointer-events-none opacity-0"
          : "opacity-100",
      ].join(" ")}
      role="group"
      aria-label="Chart navigation controls"
    >
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={
            dark
              ? "h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white"
              : "h-8 w-8"
          }
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
          className={
            dark
              ? "h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white"
              : "h-8 w-8"
          }
          aria-label="Zoom in"
          title="Zoom in"
          onClick={onZoomIn}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>

        <div className={dark ? "mx-0.5 h-5 w-px bg-slate-700" : "mx-0.5 h-5 w-px bg-border"} />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={
            dark
              ? "h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white"
              : "h-8 w-8"
          }
          aria-label="Scroll chart left"
          title="Scroll left"
          onClick={onScrollLeft}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={
            dark
              ? "h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white"
              : "h-8 w-8"
          }
          aria-label="Scroll chart right"
          title="Scroll right"
          onClick={onScrollRight}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>

        <div className={dark ? "mx-0.5 h-5 w-px bg-slate-700" : "mx-0.5 h-5 w-px bg-border"} />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={
            dark
              ? "h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white"
              : "h-8 w-8"
          }
          aria-label="Reset chart view"
          title="Reset chart view"
          onClick={onResetView}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
