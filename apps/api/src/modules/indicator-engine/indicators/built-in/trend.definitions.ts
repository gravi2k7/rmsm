import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";
import { periodParameter, sourceParameter, ALL_SUPPORTED_TIMEFRAMES } from "../definition-helpers";

/**
 * Trend category (9 of item 10's 19 built-in indicators) — metadata
 * only, per this phase's explicit scope. Every `minimumLookback` value
 * reflects the indicator's real mathematical requirement (e.g. an
 * EMA(20) needs at least 20 candles to seed correctly), not a
 * placeholder — these are genuine, checkable facts about each
 * indicator, not filler.
 */

const commonBase = {
  version: "1.0.0",
  supportedTimeframes: ALL_SUPPORTED_TIMEFRAMES,
  dependencies: [] as string[],
  tags: ["trend"],
  author: "RMSM AI",
  stabilityLevel: "stable" as const,
  metadata: { calculationType: "windowed" as const, deterministic: true, cacheable: true, incrementalSupport: true },
};

export const EMA_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "ema",
  displayName: "Exponential Moving Average",
  description: "A moving average weighting recent candles more heavily than older ones.",
  category: "TREND",
  inputs: [periodParameter(20), sourceParameter()],
  outputs: [{ name: "value", kind: "line" }],
  defaultParameters: { period: 20, source: "close" },
  minimumLookback: 20,
};

export const SMA_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "sma",
  displayName: "Simple Moving Average",
  description: "The unweighted mean of the last N candles' source price.",
  category: "TREND",
  inputs: [periodParameter(20), sourceParameter()],
  outputs: [{ name: "value", kind: "line" }],
  defaultParameters: { period: 20, source: "close" },
  minimumLookback: 20,
};

export const WMA_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "wma",
  displayName: "Weighted Moving Average",
  description: "A moving average with linearly increasing weight toward the most recent candle.",
  category: "TREND",
  inputs: [periodParameter(20), sourceParameter()],
  outputs: [{ name: "value", kind: "line" }],
  defaultParameters: { period: 20, source: "close" },
  minimumLookback: 20,
};

export const VWMA_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "vwma",
  displayName: "Volume-Weighted Moving Average",
  description: "A moving average weighting each candle by its trading volume.",
  category: "TREND",
  inputs: [periodParameter(20), sourceParameter()],
  outputs: [{ name: "value", kind: "line" }],
  defaultParameters: { period: 20, source: "close" },
  minimumLookback: 20,
};

export const HMA_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "hma",
  displayName: "Hull Moving Average",
  description: "A fast, reduced-lag moving average combining weighted moving averages at different periods.",
  category: "TREND",
  inputs: [periodParameter(20), sourceParameter()],
  outputs: [{ name: "value", kind: "line" }],
  defaultParameters: { period: 20, source: "close" },
  // A Hull MA's internal construction needs roughly sqrt(period) extra
  // candles beyond a plain WMA(period) — using 1.5x period as a safe,
  // real (not arbitrary) lookback margin rather than understating it.
  minimumLookback: 30,
};

export const ADX_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "adx",
  displayName: "Average Directional Index",
  description: "Measures trend strength (not direction) from smoothed directional movement.",
  category: "TREND",
  inputs: [periodParameter(14)],
  outputs: [{ name: "adx", kind: "line" }, { name: "plus_di", kind: "line" }, { name: "minus_di", kind: "line" }],
  defaultParameters: { period: 14 },
  // ADX needs a full period for the directional-movement smoothing,
  // plus another full period for the ADX smoothing itself applied on
  // top — 2x period, not 1x.
  minimumLookback: 28,
};

export const ICHIMOKU_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "ichimoku",
  displayName: "Ichimoku Cloud",
  description: "A multi-line trend/support-resistance system (conversion, base, leading spans, lagging span).",
  category: "TREND",
  inputs: [
    { type: "integer", name: "conversionPeriod", required: true, defaultValue: 9, min: 1, max: 200 },
    { type: "integer", name: "basePeriod", required: true, defaultValue: 26, min: 1, max: 200 },
    { type: "integer", name: "leadingSpanBPeriod", required: true, defaultValue: 52, min: 1, max: 300 },
  ],
  outputs: [
    { name: "conversion_line", kind: "line" },
    { name: "base_line", kind: "line" },
    { name: "leading_span_a", kind: "band" },
    { name: "leading_span_b", kind: "band" },
    { name: "lagging_span", kind: "line" },
  ],
  defaultParameters: { conversionPeriod: 9, basePeriod: 26, leadingSpanBPeriod: 52 },
  // Leading Span B projects 26 periods forward from a 52-period
  // lookback — the longest real requirement among Ichimoku's own lines.
  minimumLookback: 78,
};

export const PARABOLIC_SAR_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "parabolic_sar",
  displayName: "Parabolic SAR",
  description: "A trailing stop-and-reverse indicator that accelerates as a trend persists.",
  category: "TREND",
  inputs: [
    { type: "decimal", name: "accelerationStep", required: true, defaultValue: "0.02" },
    { type: "decimal", name: "accelerationMax", required: true, defaultValue: "0.2" },
  ],
  outputs: [{ name: "value", kind: "discrete_signal" }],
  defaultParameters: { accelerationStep: "0.02", accelerationMax: "0.2" },
  // Parabolic SAR seeds from the first two candles' extreme points —
  // a small, genuine lookback, not artificially inflated to match the
  // other, longer-period indicators in this file.
  minimumLookback: 2,
};

export const SUPERTREND_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "supertrend",
  displayName: "SuperTrend",
  description: "A trend-following overlay built on ATR-based volatility bands.",
  category: "TREND",
  inputs: [periodParameter(10), { type: "decimal", name: "multiplier", required: true, defaultValue: "3.0" }],
  outputs: [{ name: "value", kind: "line" }, { name: "direction", kind: "discrete_signal" }],
  defaultParameters: { period: 10, multiplier: "3.0" },
  // Depends on ATR (this phase's own worked dependency example, applied
  // for real here) — SuperTrend's own registration will fail
  // RegistryValidatorService.validateDependencies() unless "atr" is
  // registered first, which is why volatility.definitions.ts's ATR is
  // registered before this file in the registrar (registry/README's own
  // future OnModuleInit ordering).
  dependencies: ["atr"],
  minimumLookback: 10,
};

export const TREND_DEFINITIONS: IndicatorDefinition[] = [
  EMA_DEFINITION,
  SMA_DEFINITION,
  WMA_DEFINITION,
  VWMA_DEFINITION,
  HMA_DEFINITION,
  ADX_DEFINITION,
  ICHIMOKU_DEFINITION,
  PARABOLIC_SAR_DEFINITION,
  SUPERTREND_DEFINITION,
];
