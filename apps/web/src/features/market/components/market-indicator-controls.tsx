"use client";

import { BarChart3 } from "lucide-react";
import { useState } from "react";
import { Button } from "@rmsm/ui";
import type { IndicatorConfig } from "../indicators/config";
import {
  MARKET_CHART_TOOLBAR_BUTTON_CLASS,
} from "./market-chart-toolbar-styles";

interface MarketIndicatorControlsProps {
  indicators: IndicatorConfig[];
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<IndicatorConfig>) => void;
}

function indicatorLabel(indicator: IndicatorConfig): string {
  switch (indicator.type) {
    case "SMA":
    case "EMA":
    case "WMA":
    case "RSI":
    case "ATR":
    case "ADX":
      return `${indicator.type} ${indicator.period ?? ""}`.trim();

    case "VWAP":
      return "VWAP";

    case "BOLLINGER":
      return `Bollinger ${indicator.period ?? 20}, ${
        indicator.standardDeviations ?? 2
      }`;

    case "MACD":
      return `MACD ${indicator.fastPeriod ?? 12},${
        indicator.slowPeriod ?? 26
      },${indicator.signalPeriod ?? 9}`;

    case "STOCHASTIC":
      return `Stochastic ${indicator.period ?? 14},${
        indicator.smoothK ?? 3
      },${indicator.smoothD ?? 3}`;

    default:
      return indicator.type;
  }
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 px-2 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = Number(event.target.value);

          if (!Number.isFinite(next)) {
            return;
          }

          const bounded = Math.min(max, Math.max(min, next));

          onChange(bounded);
        }}
        className="h-7 w-20 rounded-md border bg-background px-2 text-right text-xs outline-none focus:ring-1 focus:ring-primary"
        data-testid={`indicator-param-${label}`}
      />
    </label>
  );
}

function IndicatorParameters({
  indicator,
  onUpdate,
}: {
  indicator: IndicatorConfig;
  onUpdate: (patch: Partial<IndicatorConfig>) => void;
}) {
  switch (indicator.type) {
    case "SMA":
    case "EMA":
    case "WMA":
    case "RSI":
    case "ATR":
    case "ADX":
      return (
        <NumberField
          label="Period"
          value={indicator.period ?? 14}
          min={1}
          max={500}
          onChange={(period) => onUpdate({ period })}
        />
      );

    case "BOLLINGER":
      return (
        <>
          <NumberField
            label="Period"
            value={indicator.period ?? 20}
            min={1}
            max={500}
            onChange={(period) => onUpdate({ period })}
          />

          <NumberField
            label="Std Dev"
            value={indicator.standardDeviations ?? 2}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(standardDeviations) =>
              onUpdate({ standardDeviations })
            }
          />
        </>
      );

    case "MACD":
      return (
        <>
          <NumberField
            label="Fast"
            value={indicator.fastPeriod ?? 12}
            min={1}
            max={200}
            onChange={(fastPeriod) => onUpdate({ fastPeriod })}
          />

          <NumberField
            label="Slow"
            value={indicator.slowPeriod ?? 26}
            min={2}
            max={500}
            onChange={(slowPeriod) => onUpdate({ slowPeriod })}
          />

          <NumberField
            label="Signal"
            value={indicator.signalPeriod ?? 9}
            min={1}
            max={200}
            onChange={(signalPeriod) => onUpdate({ signalPeriod })}
          />
        </>
      );

    case "STOCHASTIC":
      return (
        <>
          <NumberField
            label="Period"
            value={indicator.period ?? 14}
            min={1}
            max={200}
            onChange={(period) => onUpdate({ period })}
          />

          <NumberField
            label="%K"
            value={indicator.smoothK ?? 3}
            min={1}
            max={100}
            onChange={(smoothK) => onUpdate({ smoothK })}
          />

          <NumberField
            label="%D"
            value={indicator.smoothD ?? 3}
            min={1}
            max={100}
            onChange={(smoothD) => onUpdate({ smoothD })}
          />
        </>
      );

    case "VWAP":
      return (
        <div className="px-2 py-1 text-xs text-muted-foreground">
          No parameters
        </div>
      );

    default:
      return null;
  }
}

function IndicatorRow({
  indicator,
  expanded,
  onToggle,
  onExpand,
  onUpdate,
}: {
  indicator: IndicatorConfig;
  expanded: boolean;
  onToggle: (id: string) => void;
  onExpand: (id: string) => void;
  onUpdate: (id: string, patch: Partial<IndicatorConfig>) => void;
}) {
  return (
    <div
      className="rounded-md"
      data-testid={`indicator-row-${indicator.id}`}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-muted"
          onClick={() => onToggle(indicator.id)}
          aria-pressed={indicator.visible}
          data-testid={`indicator-toggle-${indicator.id}`}
        >
          <span
            className={[
              "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
              indicator.visible
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/40",
            ].join(" ")}
          >
            {indicator.visible ? "✓" : ""}
          </span>

          <span className="truncate">
            {indicatorLabel(indicator)}
          </span>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          onClick={() => onExpand(indicator.id)}
          aria-expanded={expanded}
          aria-label={`Edit ${indicator.type}`}
          data-testid={`indicator-edit-${indicator.id}`}
        >
          {expanded ? "−" : "⋮"}
        </Button>
      </div>

      {expanded ? (
        <div
          className="mb-1 ml-6 rounded-md border bg-muted/30 py-1"
          data-testid={`indicator-parameters-${indicator.id}`}
        >
          <IndicatorParameters
            indicator={indicator}
            onUpdate={(patch) => onUpdate(indicator.id, patch)}
          />
        </div>
      ) : null}
    </div>
  );
}

export function MarketIndicatorControls({
  indicators,
  onToggle,
  onUpdate,
}: MarketIndicatorControlsProps) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const overlays = indicators.filter(
    (indicator) => indicator.placement === "overlay",
  );

  const panes = indicators.filter(
    (indicator) => indicator.placement === "pane",
  );

  const activeCount = indicators.filter(
    (indicator) => indicator.visible,
  ).length;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={MARKET_CHART_TOOLBAR_BUTTON_CLASS}
        data-active={activeCount > 0}
        onClick={() =>
          setOpen((value) => !value)
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Indicators"
        title="Indicators"
        data-testid="market-indicator-controls"
      >
        <BarChart3
          className="h-4 w-4"
          aria-hidden="true"
        />
        <span className="sr-only">Indicators</span>
        {activeCount > 0 ? (
          <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
            {activeCount}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-background p-2 shadow-xl"
          data-testid="market-indicator-menu"
        >
          <div className="mb-2 flex items-center justify-between px-2">
            <div>
              <div className="text-sm font-semibold">
                Indicators
              </div>
              <div className="text-xs text-muted-foreground">
                Technical studies
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOpen(false)}
              aria-label="Close indicators"
            >
              ×
            </Button>
          </div>

          <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Overlays
          </div>

          <div className="space-y-0.5">
            {overlays.map((indicator) => (
              <IndicatorRow
                key={indicator.id}
                indicator={indicator}
                expanded={expandedId === indicator.id}
                onToggle={onToggle}
                onExpand={(id) =>
                  setExpandedId((current) =>
                    current === id ? null : id,
                  )
                }
                onUpdate={onUpdate}
              />
            ))}
          </div>

          <div className="my-2 border-t" />

          <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Oscillators
          </div>

          <div className="space-y-0.5">
            {panes.map((indicator) => (
              <IndicatorRow
                key={indicator.id}
                indicator={indicator}
                expanded={expandedId === indicator.id}
                onToggle={onToggle}
                onExpand={(id) =>
                  setExpandedId((current) =>
                    current === id ? null : id,
                  )
                }
                onUpdate={onUpdate}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
