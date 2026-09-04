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
  visible: boolean;
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
];
