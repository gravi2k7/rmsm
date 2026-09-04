import type { IndicatorConfig } from "./indicators/config";
import {
  cloneMarketChartSettings,
  type MarketChartSettings,
} from "./chart-settings";

export interface MarketChartTemplate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  indicators: IndicatorConfig[];
  chartSettings: MarketChartSettings;
}

export interface CreateMarketChartTemplateInput {
  name: string;
  indicators: IndicatorConfig[];
  chartSettings: MarketChartSettings;
}

export function createMarketChartTemplate(
  input: CreateMarketChartTemplateInput,
): MarketChartTemplate {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    createdAt: now,
    updatedAt: now,
    indicators: input.indicators.map((indicator) => ({
      ...indicator,
    })),
    chartSettings: cloneMarketChartSettings(
      input.chartSettings,
    ),
  };
}

export function cloneMarketChartTemplate(
  template: MarketChartTemplate,
): MarketChartTemplate {
  return {
    ...template,
    indicators: template.indicators.map(
      (indicator) => ({
        ...indicator,
      }),
    ),
    chartSettings: cloneMarketChartSettings(
      template.chartSettings,
    ),
  };
}
