"use client";

import {
  Check,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import {
  Button,
  Input,
  Label,
} from "@rmsm/ui";

import type { MarketChartSettings } from "../chart-settings";
import type { IndicatorConfig } from "../indicators/config";
import {
  useMarketChartTemplateStore,
} from "../chart-template-store";

interface MarketChartTemplateDialogProps {
  open: boolean;
  indicators: IndicatorConfig[];
  chartSettings: MarketChartSettings;
  onClose: () => void;
}

export function MarketChartTemplateDialog({
  open,
  indicators,
  chartSettings,
  onClose,
}: MarketChartTemplateDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(
    null,
  );

  const saveTemplate =
    useMarketChartTemplateStore(
      (state) => state.saveTemplate,
    );

  useEffect(() => {
    if (!open) {
      return;
    }

    setName("");
    setError(null);
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSave = () => {
    const normalizedName = name.trim();

    if (!normalizedName) {
      setError("Enter a template name.");
      return;
    }

    if (normalizedName.length > 80) {
      setError(
        "Template name must be 80 characters or fewer.",
      );
      return;
    }

    try {
      saveTemplate({
        name: normalizedName,
        indicators,
        chartSettings,
      });

      onClose();
    } catch {
      setError(
        "Unable to save the chart template.",
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-lg border bg-popover text-popover-foreground shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="market-chart-template-title"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2
              id="market-chart-template-title"
              className="text-sm font-semibold"
            >
              Save Chart Template
            </h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Save indicators and chart settings for reuse.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            aria-label="Close save template dialog"
            onClick={onClose}
          >
            <X
              className="h-4 w-4"
              aria-hidden="true"
            />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="market-chart-template-name">
              Template name
            </Label>

            <Input
              id="market-chart-template-name"
              autoFocus
              value={name}
              maxLength={80}
              placeholder="e.g. Momentum Setup"
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSave();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  onClose();
                }
              }}
            />

            {error && (
              <p className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="font-medium">
              This template will save
            </div>

            <div className="mt-2 space-y-1 text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">
                  Indicators:
                </span>{" "}
                {indicators.length}
              </div>

              <div>
                <span className="font-medium text-foreground">
                  Chart settings:
                </span>{" "}
                Included
              </div>

              <div>
                <span className="font-medium text-foreground">
                  Drawings:
                </span>{" "}
                Not included
              </div>

              <div>
                <span className="font-medium text-foreground">
                  Symbol:
                </span>{" "}
                Not included
              </div>

              <div>
                <span className="font-medium text-foreground">
                  Current view:
                </span>{" "}
                Not included
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
          >
            <Check
              className="mr-1.5 h-4 w-4"
              aria-hidden="true"
            />
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
}
