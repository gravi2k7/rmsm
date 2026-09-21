import type { MarketIndicatorType } from "./types";

export type IndicatorPlacement = "overlay" | "pane";

export interface IndicatorConfig {
  id: string;
  type: MarketIndicatorType;
  placement: IndicatorPlacement;
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  smoothK?: number;
  smoothD?: number;
  standardDeviations?: number;
  source?: "close" | "open" | "high" | "low" | "hl2" | "hlc3";
  visible: boolean;
}

export function mergeIndicatorConfigs(
  persisted: IndicatorConfig[],
): IndicatorConfig[] {
  const defaultsById = new Map(
    DEFAULT_INDICATORS.map((indicator) => [
      indicator.id,
      indicator,
    ]),
  );

  const merged = persisted.map((indicator) => ({
    ...(defaultsById.get(indicator.id) ?? {}),
    ...indicator,
  }));

  const persistedIds = new Set(
    persisted.map((indicator) => indicator.id),
  );

  for (const indicator of DEFAULT_INDICATORS) {
    if (!persistedIds.has(indicator.id)) {
      merged.push({ ...indicator });
    }
  }

  return merged;
}

export const DEFAULT_INDICATORS: IndicatorConfig[] = [
  {
    id: "sma-20",
    type: "SMA",
    placement: "overlay",
    period: 20,
    visible: false,
  },
  {
    id: "ema-20",
    type: "EMA",
    placement: "overlay",
    period: 20,
    visible: false,
  },
  {
    id: "wma-20",
    type: "WMA",
    placement: "overlay",
    period: 20,
    visible: false,
  },
  {
    id: "vwap",
    type: "VWAP",
    placement: "overlay",
    visible: false,
  },
  {
    id: "bollinger-20",
    type: "BOLLINGER",
    placement: "overlay",
    period: 20,
    standardDeviations: 2,
    visible: false,
  },
  {
    id: "rsi-14",
    type: "RSI",
    placement: "pane",
    period: 14,
    visible: false,
  },
  {
    id: "macd-12-26-9",
    type: "MACD",
    placement: "pane",
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    visible: false,
  },
  {
    id: "stochastic-14-3-3",
    type: "STOCHASTIC",
    placement: "pane",
    period: 14,
    smoothK: 3,
    smoothD: 3,
    visible: false,
  },
  {
    id: "atr-14",
    type: "ATR",
    placement: "pane",
    period: 14,
    visible: false,
  },
  {
    id: "adx-14",
    type: "ADX",
    placement: "pane",
    period: 14,
    visible: false,
  },
  {
    id: "vwma-20",
    type: "VWMA",
    placement: "overlay",
    period: 20,
    visible: false,
  },
  {
    id: "cci-20",
    type: "CCI",
    placement: "pane",
    period: 20,
    visible: false,
  },
  {
    id: "roc-12",
    type: "ROC",
    placement: "pane",
    period: 12,
    visible: false,
  },
  {
    id: "williams-r-14",
    type: "WILLIAMS_R",
    placement: "pane",
    period: 14,
    visible: false,
  },
  {
    id: "obv",
    type: "OBV",
    placement: "pane",
    visible: false,
  },
  {
    id: "volume",
    type: "VOLUME",
    placement: "pane",
    visible: false,
  },
];
