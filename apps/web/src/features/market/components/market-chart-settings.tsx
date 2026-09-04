"use client";

import * as React from "react";

import {
  ChevronDown,
  RotateCcw,
} from "lucide-react";

import { Button, Input, Label } from "@rmsm/ui";

import {
  DEFAULT_MARKET_CHART_SETTINGS,
  type MarketChartSettings,
} from "../chart-settings";

interface MarketChartSettingsProps {
  value: MarketChartSettings;
  onChange: (settings: MarketChartSettings) => void;
  onReset: () => void;
}

type Section =
  | "appearance"
  | "candles"
  | "crosshair"
  | "priceScale"
  | "timeScale"
  | "trading";

function SectionHeader({
  label,
  open,
  onClick,
}: {
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs font-medium hover:bg-muted"
      onClick={onClick}
      aria-expanded={open}
    >
      <span>{label}</span>
      <ChevronDown
        className={`h-4 w-4 transition-transform ${
          open ? "rotate-180" : ""
        }`}
        aria-hidden="true"
      />
    </button>
  );
}

function BooleanRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 px-2 py-1.5">
      <span className="text-xs text-muted-foreground">
        {label}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`flex h-5 w-9 items-center rounded-full border transition ${
          checked
            ? "justify-end bg-primary"
            : "justify-start bg-muted"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`mx-0.5 h-3.5 w-3.5 rounded-full ${
            checked
              ? "bg-primary-foreground"
              : "bg-muted-foreground"
          }`}
        />
      </button>
    </label>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
      </Label>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={
            value.startsWith("#")
              ? value
              : DEFAULT_MARKET_CHART_SETTINGS.appearance.backgroundColor
          }
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-7 w-10 cursor-pointer rounded border bg-transparent p-0.5"
          aria-label={label}
        />

        <Input
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-7 w-24 text-xs"
          aria-label={`${label} value`}
        />
      </div>
    </div>
  );
}

export function MarketChartSettings({
  value,
  onChange,
  onReset,
}: MarketChartSettingsProps) {
  const [openSections, setOpenSections] = React.useState<
    Record<Section, boolean>
  >({
    appearance: true,
    candles: false,
    crosshair: false,
    priceScale: false,
    timeScale: false,
    trading: false,
  });

  const toggleSection = (section: Section) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  return (
    <div
      className="w-96 rounded-md border bg-popover text-popover-foreground shadow-xl"
      role="dialog"
      aria-label="Chart settings"
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div>
          <div className="text-sm font-semibold">
            Chart Settings
          </div>
          <div className="text-[10px] text-muted-foreground">
            Applies to the entire chart
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={onReset}
        >
          <RotateCcw
            className="mr-1.5 h-3.5 w-3.5"
            aria-hidden="true"
          />
          Reset
        </Button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-1">
        <SectionHeader
          label="Appearance"
          open={openSections.appearance}
          onClick={() => toggleSection("appearance")}
        />

        {openSections.appearance && (
          <div className="border-b pb-1">
            <ColorRow
              label="Background"
              value={value.appearance.backgroundColor}
              onChange={(backgroundColor) =>
                onChange({
                  ...value,
                  appearance: {
                    ...value.appearance,
                    backgroundColor,
                  },
                })
              }
            />

            <ColorRow
              label="Text color"
              value={value.appearance.textColor}
              onChange={(textColor) =>
                onChange({
                  ...value,
                  appearance: {
                    ...value.appearance,
                    textColor,
                  },
                })
              }
            />

            <BooleanRow
              label="Grid"
              checked={value.appearance.gridVisible}
              onChange={(gridVisible) =>
                onChange({
                  ...value,
                  appearance: {
                    ...value.appearance,
                    gridVisible,
                  },
                })
              }
            />

            <div className="px-2 py-1.5">
              <Label className="text-xs text-muted-foreground">
                Grid opacity
              </Label>

              <input
                type="range"
                min="0"
                max="0.3"
                step="0.01"
                value={value.appearance.gridOpacity}
                onChange={(event) =>
                  onChange({
                    ...value,
                    appearance: {
                      ...value.appearance,
                      gridOpacity: Number(
                        event.target.value,
                      ),
                    },
                  })
                }
                className="mt-2 w-full"
                aria-label="Grid opacity"
              />
            </div>
          </div>
        )}

        <SectionHeader
          label="Candles"
          open={openSections.candles}
          onClick={() => toggleSection("candles")}
        />

        {openSections.candles && (
          <div className="border-b pb-1">
            <ColorRow
              label="Up color"
              value={value.candles.upColor}
              onChange={(upColor) =>
                onChange({
                  ...value,
                  candles: {
                    ...value.candles,
                    upColor,
                  },
                })
              }
            />

            <ColorRow
              label="Down color"
              value={value.candles.downColor}
              onChange={(downColor) =>
                onChange({
                  ...value,
                  candles: {
                    ...value.candles,
                    downColor,
                  },
                })
              }
            />

            <ColorRow
              label="Up wick"
              value={value.candles.wickUpColor}
              onChange={(wickUpColor) =>
                onChange({
                  ...value,
                  candles: {
                    ...value.candles,
                    wickUpColor,
                  },
                })
              }
            />

            <ColorRow
              label="Down wick"
              value={value.candles.wickDownColor}
              onChange={(wickDownColor) =>
                onChange({
                  ...value,
                  candles: {
                    ...value.candles,
                    wickDownColor,
                  },
                })
              }
            />

            <BooleanRow
              label="Candle border"
              checked={value.candles.borderVisible}
              onChange={(borderVisible) =>
                onChange({
                  ...value,
                  candles: {
                    ...value.candles,
                    borderVisible,
                  },
                })
              }
            />

            <BooleanRow
              label="Wicks"
              checked={value.candles.wickVisible}
              onChange={(wickVisible) =>
                onChange({
                  ...value,
                  candles: {
                    ...value.candles,
                    wickVisible,
                  },
                })
              }
            />
          </div>
        )}

        <SectionHeader
          label="Crosshair"
          open={openSections.crosshair}
          onClick={() => toggleSection("crosshair")}
        />

        {openSections.crosshair && (
          <div className="border-b pb-1">
            <div className="px-2 py-1.5">
              <Label className="text-xs text-muted-foreground">
                Mode
              </Label>

              <select
                value={String(value.crosshair.mode)}
                onChange={(event) =>
                  onChange({
                    ...value,
                    crosshair: {
                      ...value.crosshair,
                      mode:
                        event.target.value === "0"
                          ? 0
                          : 1,
                    },
                  })
                }
                className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs"
                aria-label="Crosshair mode"
              >
                <option value="1">
                  Normal
                </option>
                <option value="0">
                  Magnet
                </option>
              </select>
            </div>

            <BooleanRow
              label="Time label"
              checked={value.crosshair.showTimeLabel}
              onChange={(showTimeLabel) =>
                onChange({
                  ...value,
                  crosshair: {
                    ...value.crosshair,
                    showTimeLabel,
                  },
                })
              }
            />

            <BooleanRow
              label="Price label"
              checked={value.crosshair.showPriceLabel}
              onChange={(showPriceLabel) =>
                onChange({
                  ...value,
                  crosshair: {
                    ...value.crosshair,
                    showPriceLabel,
                  },
                })
              }
            />

            <BooleanRow
              label="OHLC"
              checked={value.crosshair.showOHLC}
              onChange={(showOHLC) =>
                onChange({
                  ...value,
                  crosshair: {
                    ...value.crosshair,
                    showOHLC,
                  },
                })
              }
            />

            <div className="px-2 py-1.5">
              <Label className="text-xs text-muted-foreground">
                Line opacity
              </Label>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={value.crosshair.lineOpacity}
                onChange={(event) =>
                  onChange({
                    ...value,
                    crosshair: {
                      ...value.crosshair,
                      lineOpacity: Number(
                        event.target.value,
                      ),
                    },
                  })
                }
                className="mt-2 w-full"
                aria-label="Crosshair line opacity"
              />
            </div>
          </div>
        )}

        <SectionHeader
          label="Price Scale"
          open={openSections.priceScale}
          onClick={() => toggleSection("priceScale")}
        />

        {openSections.priceScale && (
          <div className="border-b pb-1">
            <BooleanRow
              label="Auto scale"
              checked={value.priceScale.autoScale}
              onChange={(autoScale) =>
                onChange({
                  ...value,
                  priceScale: {
                    ...value.priceScale,
                    autoScale,
                  },
                })
              }
            />

            <BooleanRow
              label="Scale border"
              checked={value.priceScale.borderVisible}
              onChange={(borderVisible) =>
                onChange({
                  ...value,
                  priceScale: {
                    ...value.priceScale,
                    borderVisible,
                  },
                })
              }
            />

            <BooleanRow
              label="Last value"
              checked={value.priceScale.lastValueVisible}
              onChange={(lastValueVisible) =>
                onChange({
                  ...value,
                  priceScale: {
                    ...value.priceScale,
                    lastValueVisible,
                  },
                })
              }
            />

            <BooleanRow
              label="Price line"
              checked={value.priceScale.priceLineVisible}
              onChange={(priceLineVisible) =>
                onChange({
                  ...value,
                  priceScale: {
                    ...value.priceScale,
                    priceLineVisible,
                  },
                })
              }
            />
          </div>
        )}

        <SectionHeader
          label="Trading"
          open={openSections.trading}
          onClick={() => toggleSection("trading")}
        />

        {openSections.trading && (
          <div className="pb-1">
            <BooleanRow
              label="Show positions"
              checked={value.trading.showPositions}
              onChange={(showPositions) =>
                onChange({
                  ...value,
                  trading: {
                    ...value.trading,
                    showPositions,
                  },
                })
              }
            />

            <BooleanRow
              label="Position labels"
              checked={value.trading.showPositionLabels}
              onChange={(showPositionLabels) =>
                onChange({
                  ...value,
                  trading: {
                    ...value.trading,
                    showPositionLabels,
                  },
                })
              }
            />

            <div className="px-2 py-1.5">
              <Label className="text-xs text-muted-foreground">
                Position alignment
              </Label>

              <select
                value={value.trading.positionAlignment}
                onChange={(event) =>
                  onChange({
                    ...value,
                    trading: {
                      ...value.trading,
                      positionAlignment:
                        event.target.value === "left"
                          ? "left"
                          : event.target.value === "middle"
                            ? "middle"
                            : "right",
                    },
                  })
                }
                className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs"
                aria-label="Position alignment"
              >
                <option value="left">Left</option>
                <option value="middle">Middle</option>
                <option value="right">Right</option>
              </select>
            </div>

            <BooleanRow
              label="Show SL / TP"
              checked={value.trading.showRiskLines}
              onChange={(showRiskLines) =>
                onChange({
                  ...value,
                  trading: {
                    ...value.trading,
                    showRiskLines,
                  },
                })
              }
            />
          </div>
        )}

        <SectionHeader
          label="Time Scale"
          open={openSections.timeScale}
          onClick={() => toggleSection("timeScale")}
        />

        {openSections.timeScale && (
          <div className="pb-1">
            <BooleanRow
              label="Time visible"
              checked={value.timeScale.timeVisible}
              onChange={(timeVisible) =>
                onChange({
                  ...value,
                  timeScale: {
                    ...value.timeScale,
                    timeVisible,
                  },
                })
              }
            />

            <BooleanRow
              label="Seconds visible"
              checked={value.timeScale.secondsVisible}
              onChange={(secondsVisible) =>
                onChange({
                  ...value,
                  timeScale: {
                    ...value.timeScale,
                    secondsVisible,
                  },
                })
              }
            />

            <BooleanRow
              label="Time scale border"
              checked={value.timeScale.borderVisible}
              onChange={(borderVisible) =>
                onChange({
                  ...value,
                  timeScale: {
                    ...value.timeScale,
                    borderVisible,
                  },
                })
              }
            />
          </div>
        )}
      </div>

      <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">
        Settings are saved with the current market workspace.
      </div>
    </div>
  );
}
