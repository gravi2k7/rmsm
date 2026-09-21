"use client";

import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@rmsm/ui";
import type { BacktestReplayState } from "./backtest-replay";

interface BacktestReplayToolbarProps {
  state: BacktestReplayState;
  candleCount: number;
  onReset: () => void;
  onStepBackward: () => void;
  onToggle: () => void;
  onStepForward: () => void;
  onSpeedChange: (speed: number) => void;
}

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8];

export function BacktestReplayToolbar({
  state,
  candleCount,
  onReset,
  onStepBackward,
  onToggle,
  onStepForward,
  onSpeedChange,
}: BacktestReplayToolbarProps) {
  const atStart = state.cursor <= 0;
  const atEnd =
    candleCount === 0 ||
    state.cursor >= candleCount - 1;

  return (
    <div
      className="flex items-center gap-1 rounded-md border bg-background/95 px-2 py-1"
      data-testid="backtest-replay-toolbar"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onReset}
        disabled={atStart}
        aria-label="Reset replay"
        title="Reset replay"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onStepBackward}
        disabled={atStart}
        aria-label="Step backward"
        title="Step backward"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="default"
        size="icon"
        onClick={onToggle}
        disabled={candleCount === 0}
        aria-label={state.playing ? "Pause replay" : "Play replay"}
        title={state.playing ? "Pause replay" : "Play replay"}
      >
        {state.playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onStepForward}
        disabled={atEnd}
        aria-label="Step forward"
        title="Step forward"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <select
        className="h-8 rounded-md border bg-background px-2 text-xs"
        value={state.speed}
        onChange={(event) =>
          onSpeedChange(Number(event.target.value))
        }
        aria-label="Replay speed"
      >
        {SPEEDS.map((speed) => (
          <option key={speed} value={speed}>
            {speed}x
          </option>
        ))}
      </select>

      <span
        className="ml-2 min-w-[110px] text-center text-xs text-muted-foreground"
        data-testid="backtest-replay-counter"
      >
        {candleCount === 0
          ? "No candles"
          : `${state.cursor + 1} / ${candleCount}`}
      </span>
    </div>
  );
}
