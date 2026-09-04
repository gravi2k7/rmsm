import { create } from "zustand";
import {
  createJSONStorage,
  persist,
} from "zustand/middleware";

import type {
  CreateMarketChartTemplateInput,
  MarketChartTemplate,
} from "./chart-template";
import {
  cloneMarketChartTemplate,
  createMarketChartTemplate,
} from "./chart-template";

interface MarketChartTemplateStore {
  templates: MarketChartTemplate[];

  saveTemplate: (
    input: CreateMarketChartTemplateInput,
  ) => MarketChartTemplate;

  updateTemplate: (
    id: string,
    patch: Partial<
      Pick<
        MarketChartTemplate,
        "name" | "indicators" | "chartSettings"
      >
    >,
  ) => void;

  deleteTemplate: (id: string) => void;

  getTemplate: (
    id: string,
  ) => MarketChartTemplate | undefined;
}

export const useMarketChartTemplateStore =
  create<MarketChartTemplateStore>()(
    persist(
      (set, get) => ({
        templates: [],

        saveTemplate: (input) => {
          const template =
            createMarketChartTemplate(input);

          set((state) => ({
            templates: [
              ...state.templates,
              template,
            ],
          }));

          return cloneMarketChartTemplate(
            template,
          );
        },

        updateTemplate: (id, patch) => {
          set((state) => ({
            templates: state.templates.map(
              (template) => {
                if (template.id !== id) {
                  return template;
                }

                return {
                  ...template,
                  ...patch,
                  name:
                    patch.name !== undefined
                      ? patch.name.trim()
                      : template.name,
                  updatedAt:
                    new Date().toISOString(),
                  indicators:
                    patch.indicators !== undefined
                      ? patch.indicators.map(
                          (indicator) => ({
                            ...indicator,
                          }),
                        )
                      : template.indicators,
                  chartSettings:
                    patch.chartSettings !== undefined
                      ? {
                          ...patch.chartSettings,
                        }
                      : template.chartSettings,
                };
              },
            ),
          }));
        },

        deleteTemplate: (id) => {
          set((state) => ({
            templates: state.templates.filter(
              (template) =>
                template.id !== id,
            ),
          }));
        },

        getTemplate: (id) => {
          const template =
            get().templates.find(
              (item) => item.id === id,
            );

          return template
            ? cloneMarketChartTemplate(template)
            : undefined;
        },
      }),
      {
        name: "rmsm-market-chart-templates",
        storage: createJSONStorage(() =>
          localStorage,
        ),
        version: 1,
      },
    ),
  );
