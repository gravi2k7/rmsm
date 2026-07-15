import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";
import { ALL_SUPPORTED_TIMEFRAMES } from "../definition-helpers";

const commonBase = {
  version: "1.0.0",
  supportedTimeframes: ALL_SUPPORTED_TIMEFRAMES,
  dependencies: [] as string[],
  tags: ["volume"],
  author: "RMSM AI",
  stabilityLevel: "stable" as const,
  metadata: { calculationType: "windowed" as const, deterministic: true, cacheable: true, incrementalSupport: true },
};

export const OBV_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "obv",
  displayName: "On-Balance Volume",
  description: "A running total of volume, added on up-candles and subtracted on down-candles.",
  category: "VOLUME",
  inputs: [],
  outputs: [{ name: "value", kind: "line" }],
  defaultParameters: {},
  // A cumulative running total — technically needs the full history to
  // be exactly correct from candle one, but is meaningfully usable with
  // a single prior candle for the up/down comparison; 1 is the real
  // minimum for producing ANY value, not an inflated safety margin.
  minimumLookback: 1,
  metadata: { ...commonBase.metadata, calculationType: "iterative" },
};

export const VWAP_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "vwap",
  displayName: "Volume-Weighted Average Price",
  description: "The cumulative volume-weighted average price, typically reset at the start of each trading session.",
  category: "VOLUME",
  inputs: [],
  outputs: [{ name: "value", kind: "line" }],
  defaultParameters: {},
  // Session-anchored (resets daily) — genuinely needs only the current
  // session's candles, not a fixed historical window; 1 is the real
  // minimum, with the actual reset behavior a Phase 2C+ calculation
  // concern (session boundaries, AI-101's own TradingSession data),
  // not something this metadata-only definition needs to encode.
  minimumLookback: 1,
  metadata: { ...commonBase.metadata, calculationType: "iterative" },
};

export const VOLUME_DEFINITIONS: IndicatorDefinition[] = [OBV_DEFINITION, VWAP_DEFINITION];
