"use client";

import {
  FilePlus2,
  LayoutTemplate,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Ref } from "react";
import { useState } from "react";

import {
  Button,
  Input,
  Label,
} from "@rmsm/ui";

import type { MarketChartSettings } from "../chart-settings";
import type { IndicatorConfig } from "../indicators/config";
import {
  MARKET_CHART_TOOLBAR_BUTTON_CLASS,
} from "./market-chart-toolbar-styles";
import {
  useMarketChartTemplateStore,
} from "../chart-template-store";
import { MarketChartTemplateDialog } from "./market-chart-template-dialog";

interface MarketChartTemplateMenuProps {
  indicators: IndicatorConfig[];
  chartSettings: MarketChartSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerRef: Ref<HTMLDivElement>;
}

export function MarketChartTemplateMenu({
  indicators,
  chartSettings,
  open,
  onOpenChange,
  containerRef,
}: MarketChartTemplateMenuProps) {
  const [saveDialogOpen, setSaveDialogOpen] =
    useState(false);

  const [renameId, setRenameId] =
    useState<string | null>(null);

  const [renameValue, setRenameValue] =
    useState("");

  const templates =
    useMarketChartTemplateStore(
      (state) => state.templates,
    );

  const deleteTemplate =
    useMarketChartTemplateStore(
      (state) => state.deleteTemplate,
    );

  const updateTemplate =
    useMarketChartTemplateStore(
      (state) => state.updateTemplate,
    );

  const startRename = (
    id: string,
    currentName: string,
  ) => {
    setRenameId(id);
    setRenameValue(currentName);
  };

  const cancelRename = () => {
    setRenameId(null);
    setRenameValue("");
  };

  const commitRename = () => {
    if (!renameId) {
      return;
    }

    const normalizedName =
      renameValue.trim();

    if (
      !normalizedName ||
      normalizedName.length > 80
    ) {
      return;
    }

    updateTemplate(renameId, {
      name: normalizedName,
    });

    cancelRename();
  };

  return (
    <>
      <div
        ref={containerRef}
        className="relative"
      >
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={MARKET_CHART_TOOLBAR_BUTTON_CLASS}
          data-active={open}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls="market-chart-template-menu"
          aria-label="Chart templates"
          title="Chart templates"
          onClick={() =>
            onOpenChange(!open)
          }
        >
          <LayoutTemplate
            className="h-4 w-4"
            aria-hidden="true"
          />
          <span className="sr-only">Templates</span>
        </Button>

        {open && (
          <div
            id="market-chart-template-menu"
            className="absolute right-0 top-full z-[100] mt-1 w-80 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-xl"
            role="menu"
          >
            <div className="border-b px-3 py-2">
              <div className="text-sm font-semibold">
                Chart Templates
              </div>

              <div className="text-[10px] text-muted-foreground">
                Save and reuse indicators and chart settings.
              </div>
            </div>

            <div className="border-b p-2">
              <Button
                type="button"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  onOpenChange(false);
                  setSaveDialogOpen(true);
                }}
              >
                <FilePlus2
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                />
                Save Current Template
              </Button>
            </div>

            <div className="max-h-80 overflow-y-auto p-1">
              {templates.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No saved templates yet.
                </div>
              ) : (
                templates.map((template) => {
                  const renaming =
                    renameId === template.id;

                  if (renaming) {
                    return (
                      <div
                        key={template.id}
                        className="rounded-md px-2 py-2"
                      >
                        <div className="space-y-2">
                          <Label
                            htmlFor={`rename-template-${template.id}`}
                            className="text-xs"
                          >
                            Template name
                          </Label>

                          <Input
                            id={`rename-template-${template.id}`}
                            value={renameValue}
                            maxLength={80}
                            autoFocus
                            onChange={(event) =>
                              setRenameValue(
                                event.target.value,
                              )
                            }
                            onKeyDown={(event) => {
                              if (
                                event.key === "Enter"
                              ) {
                                event.preventDefault();
                                commitRename();
                              }

                              if (
                                event.key === "Escape"
                              ) {
                                event.preventDefault();
                                cancelRename();
                              }
                            }}
                          />

                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={cancelRename}
                            >
                              Cancel
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              onClick={commitRename}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={template.id}
                      className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted"
                      role="menuitem"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate px-1 py-1 text-left text-sm"
                        title={template.name}
                        onClick={() =>
                          onOpenChange(false)
                        }
                      >
                        {template.name}
                      </button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        aria-label={`Rename ${template.name}`}
                        title="Rename"
                        onClick={() =>
                          startRename(
                            template.id,
                            template.name,
                          )
                        }
                      >
                        <Pencil
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive"
                        aria-label={`Delete ${template.name}`}
                        title="Delete"
                        onClick={() => {
                          deleteTemplate(
                            template.id,
                          );
                        }}
                      >
                        <Trash2
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <MarketChartTemplateDialog
        open={saveDialogOpen}
        indicators={indicators}
        chartSettings={chartSettings}
        onClose={() =>
          setSaveDialogOpen(false)
        }
      />
    </>
  );
}
