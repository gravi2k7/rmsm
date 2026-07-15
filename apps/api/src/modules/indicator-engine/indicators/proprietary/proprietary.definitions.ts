import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";
import { ALL_SUPPORTED_TIMEFRAMES } from "../definition-helpers";

/**
 * Proprietary indicator DEFINITIONS (item 11) — metadata only, no
 * calculation logic, exactly as scoped. `stabilityLevel: "experimental"`
 * throughout — honest about these being newly-registered concepts with
 * no calculation behind them yet, distinct from the built-in
 * indicators' `"stable"` (well-established, externally-known formulas).
 * Registered through the identical `IndicatorDefinition` shape as every
 * built-in indicator — no separate type, no special-case field, per
 * this module's own "proprietary indicators are exactly like built-in
 * ones" rule, applied here for real rather than just asserted in
 * documentation.
 */

const commonBase = {
  supportedTimeframes: ALL_SUPPORTED_TIMEFRAMES,
  dependencies: [] as string[],
  author: "RMSM AI",
  stabilityLevel: "experimental" as const,
  metadata: { calculationType: "windowed" as const, deterministic: true, cacheable: true, incrementalSupport: false },
};

/** Item 7's own worked versioning example, registered literally: RDSE at three real, distinct versions, demonstrating IndicatorRegistryService's multi-version coexistence for real rather than just in a doc's prose. */
export const RDSE_V1_0_0: IndicatorDefinition = {
  ...commonBase,
  identifier: "rdse",
  version: "1.0.0",
  displayName: "RDSE",
  description: "Proprietary RMSM AI indicator — calculation logic not yet implemented (metadata-only registration, Phase 2A).",
  category: "CUSTOM",
  inputs: [],
  outputs: [{ name: "value", kind: "discrete_signal" }],
  defaultParameters: {},
  minimumLookback: 50,
  tags: ["proprietary", "rdse"],
};
export const RDSE_V1_1_0: IndicatorDefinition = { ...RDSE_V1_0_0, version: "1.1.0" };
export const RDSE_V2_0_0: IndicatorDefinition = { ...RDSE_V1_0_0, version: "2.0.0" };

export const MARKET_STATE_ENGINE_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "market_state_engine",
  version: "1.0.0",
  displayName: "Market State Engine",
  description: "Proprietary RMSM AI indicator classifying overall market regime/state — calculation logic not yet implemented.",
  category: "MARKET_STRUCTURE",
  inputs: [],
  outputs: [{ name: "state", kind: "discrete_signal" }],
  defaultParameters: {},
  minimumLookback: 100,
  tags: ["proprietary", "market-structure"],
};

export const SWING_DETECTION_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "swing_detection",
  version: "1.0.0",
  displayName: "Swing Detection",
  description: "Proprietary RMSM AI indicator identifying swing highs/lows — calculation logic not yet implemented.",
  category: "MARKET_STRUCTURE",
  inputs: [{ type: "integer", name: "sensitivity", required: true, defaultValue: 5, min: 1, max: 50 }],
  outputs: [{ name: "swing_high", kind: "discrete_signal" }, { name: "swing_low", kind: "discrete_signal" }],
  defaultParameters: { sensitivity: 5 },
  minimumLookback: 20,
  tags: ["proprietary", "market-structure"],
};

export const BOS_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "bos",
  version: "1.0.0",
  displayName: "Break of Structure (BOS)",
  description: "Proprietary RMSM AI indicator detecting trend-continuation structural breaks — calculation logic not yet implemented.",
  category: "MARKET_STRUCTURE",
  inputs: [],
  outputs: [{ name: "value", kind: "discrete_signal" }],
  defaultParameters: {},
  dependencies: ["swing_detection"],
  minimumLookback: 20,
  tags: ["proprietary", "market-structure", "smc"],
};

export const CHOCH_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "choch",
  version: "1.0.0",
  displayName: "Change of Character (CHOCH)",
  description: "Proprietary RMSM AI indicator detecting trend-reversal structural breaks — calculation logic not yet implemented.",
  category: "MARKET_STRUCTURE",
  inputs: [],
  outputs: [{ name: "value", kind: "discrete_signal" }],
  defaultParameters: {},
  dependencies: ["swing_detection"],
  minimumLookback: 20,
  tags: ["proprietary", "market-structure", "smc"],
};

export const LIQUIDITY_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "liquidity_detection",
  version: "1.0.0",
  displayName: "Liquidity Detection",
  description: "Proprietary RMSM AI indicator identifying likely liquidity pools (equal highs/lows, stop clusters) — calculation logic not yet implemented.",
  category: "MARKET_STRUCTURE",
  inputs: [],
  outputs: [{ name: "value", kind: "discrete_signal" }],
  defaultParameters: {},
  dependencies: ["swing_detection"],
  minimumLookback: 30,
  tags: ["proprietary", "market-structure", "smc"],
};

export const ORDER_BLOCKS_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "order_blocks",
  version: "1.0.0",
  displayName: "Order Blocks",
  description: "Proprietary RMSM AI indicator identifying candles preceding a strong displacement move — calculation logic not yet implemented.",
  category: "PATTERN_RECOGNITION",
  inputs: [],
  outputs: [{ name: "value", kind: "discrete_signal" }],
  defaultParameters: {},
  minimumLookback: 20,
  tags: ["proprietary", "pattern", "smc"],
};

export const FAIR_VALUE_GAPS_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "fair_value_gaps",
  version: "1.0.0",
  displayName: "Fair Value Gaps",
  description: "Proprietary RMSM AI indicator identifying 3-candle imbalance gaps — calculation logic not yet implemented.",
  category: "PATTERN_RECOGNITION",
  inputs: [],
  outputs: [{ name: "value", kind: "discrete_signal" }],
  defaultParameters: {},
  // A genuine 3-candle pattern — the real, small requirement, not
  // inflated to match this file's other, longer-lookback indicators.
  minimumLookback: 3,
  tags: ["proprietary", "pattern", "smc"],
};

export const INSTITUTIONAL_STRUCTURE_DEFINITION: IndicatorDefinition = {
  ...commonBase,
  identifier: "institutional_structure",
  version: "1.0.0",
  displayName: "Institutional Structure",
  description: "Proprietary RMSM AI composite indicator combining structure/liquidity/order-flow concepts — calculation logic not yet implemented.",
  category: "COMPOSITE",
  inputs: [],
  outputs: [{ name: "value", kind: "discrete_signal" }],
  defaultParameters: {},
  // The proprietary composite this module's own docs use as the
  // "genuinely complex, real dependency chain" example — depends on 4
  // other proprietary indicators, all of which must already be
  // registered before this one, exactly like MACD depending on EMA.
  dependencies: ["market_state_engine", "liquidity_detection", "order_blocks", "bos"],
  minimumLookback: 100,
  tags: ["proprietary", "composite", "smc"],
};

export const PROPRIETARY_DEFINITIONS: IndicatorDefinition[] = [
  RDSE_V1_0_0,
  RDSE_V1_1_0,
  RDSE_V2_0_0,
  MARKET_STATE_ENGINE_DEFINITION,
  SWING_DETECTION_DEFINITION,
  BOS_DEFINITION,
  CHOCH_DEFINITION,
  LIQUIDITY_DEFINITION,
  ORDER_BLOCKS_DEFINITION,
  FAIR_VALUE_GAPS_DEFINITION,
  INSTITUTIONAL_STRUCTURE_DEFINITION,
];
