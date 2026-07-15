import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";
import { periodParameter, sourceParameter, ALL_SUPPORTED_TIMEFRAMES } from "../definition-helpers";

const commonBase = {
  version: "1.0.0",
  supportedTimeframes: ALL_SUPPORTED_TIMEFRAMES,
  tags: ["momentum"],
  author: "RMSM AI",
  stabilityLevel: "stable" as const,
  metadata: { calculationType: "windowed" as const, deterministic: true, cacheable: true, incrementalSupport: true },
};

export const RSI_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "rsi",
  displayName: "Relative Strength Index",
  description: "A bounded (0-100) momentum oscillator measuring the speed and magnitude of recent price changes.",
  category: "MOMENTUM",
  inputs: [periodParameter(14), sourceParameter()],
  outputs: [{ name: "value", kind: "line" }],
  defaultParameters: { period: 14, source: "close" },
  dependencies: [],
  minimumLookback: 14,
};

export const MACD_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "macd",
  displayName: "Moving Average Convergence Divergence",
  description: "The difference between a fast and slow EMA, plus a signal line and histogram — this module's own worked composite-indicator example (AI102_ENGINE_DESIGN.md).",
  category: "MOMENTUM",
  inputs: [
    { type: "integer", name: "fastPeriod", required: true, defaultValue: 12, min: 1, max: 200 },
    { type: "integer", name: "slowPeriod", required: true, defaultValue: 26, min: 1, max: 200 },
    { type: "integer", name: "signalPeriod", required: true, defaultValue: 9, min: 1, max: 100 },
    sourceParameter(),
  ],
  outputs: [{ name: "macd", kind: "line" }, { name: "signal", kind: "line" }, { name: "histogram", kind: "histogram" }],
  defaultParameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, source: "close" },
  /** Depends on "ema" (used at two different periods via two IndicatorInstances, a Phase 2B+ execution-time concern — the DEFINITION-level dependency is on the "ema" identifier once, not duplicated). */
  dependencies: ["ema"],
  // Slow EMA (26) + signal EMA (9) applied on top of that — the real,
  // combined requirement, not just the slow period alone.
  minimumLookback: 35,
};

export const CCI_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "cci",
  displayName: "Commodity Channel Index",
  description: "Measures deviation of the typical price from its own moving average, normalized by mean deviation.",
  category: "MOMENTUM",
  inputs: [periodParameter(20)],
  outputs: [{ name: "value", kind: "line" }],
  defaultParameters: { period: 20 },
  dependencies: [],
  minimumLookback: 20,
};

export const ROC_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "roc",
  displayName: "Rate of Change",
  description: "The percentage price change over the last N candles.",
  category: "MOMENTUM",
  inputs: [periodParameter(12), sourceParameter()],
  outputs: [{ name: "value", kind: "line" }],
  defaultParameters: { period: 12, source: "close" },
  dependencies: [],
  minimumLookback: 12,
};

export const MOMENTUM_DEFINITIONS: IndicatorDefinition[] = [RSI_DEFINITION, MACD_DEFINITION, CCI_DEFINITION, ROC_DEFINITION];
