import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";
import { periodParameter, ALL_SUPPORTED_TIMEFRAMES } from "../definition-helpers";

const commonBase = {
  version: "1.0.0",
  supportedTimeframes: ALL_SUPPORTED_TIMEFRAMES,
  dependencies: [] as string[],
  tags: ["volatility"],
  author: "RMSM AI",
  stabilityLevel: "stable" as const,
  metadata: { calculationType: "windowed" as const, deterministic: true, cacheable: true, incrementalSupport: true },
};

export const ATR_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "atr",
  displayName: "Average True Range",
  description: "A smoothed measure of price volatility from the true range of each candle.",
  category: "VOLATILITY",
  inputs: [periodParameter(14)],
  outputs: [{ name: "value", kind: "line" }],
  defaultParameters: { period: 14 },
  minimumLookback: 14,
};

export const BOLLINGER_BANDS_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "bollinger_bands",
  displayName: "Bollinger Bands",
  description: "A moving-average midline with upper/lower bands at N standard deviations.",
  category: "VOLATILITY",
  inputs: [periodParameter(20), { type: "decimal", name: "stdDevMultiplier", required: true, defaultValue: "2.0" }],
  outputs: [{ name: "upper", kind: "band" }, { name: "middle", kind: "line" }, { name: "lower", kind: "band" }],
  defaultParameters: { period: 20, stdDevMultiplier: "2.0" },
  minimumLookback: 20,
};

export const KELTNER_CHANNEL_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "keltner_channel",
  displayName: "Keltner Channel",
  description: "An EMA midline with upper/lower bands at N multiples of ATR.",
  category: "VOLATILITY",
  inputs: [periodParameter(20), { type: "decimal", name: "atrMultiplier", required: true, defaultValue: "2.0" }],
  outputs: [{ name: "upper", kind: "band" }, { name: "middle", kind: "line" }, { name: "lower", kind: "band" }],
  defaultParameters: { period: 20, atrMultiplier: "2.0" },
  dependencies: ["atr", "ema"],
  minimumLookback: 20,
};

export const DONCHIAN_CHANNEL_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "donchian_channel",
  displayName: "Donchian Channel",
  description: "Upper/lower bands at the highest high and lowest low over the last N candles.",
  category: "VOLATILITY",
  inputs: [periodParameter(20)],
  outputs: [{ name: "upper", kind: "band" }, { name: "middle", kind: "line" }, { name: "lower", kind: "band" }],
  defaultParameters: { period: 20 },
  minimumLookback: 20,
};

export const VOLATILITY_DEFINITIONS: IndicatorDefinition[] = [
  ATR_DEFINITION,
  BOLLINGER_BANDS_DEFINITION,
  KELTNER_CHANNEL_DEFINITION,
  DONCHIAN_CHANNEL_DEFINITION,
];
