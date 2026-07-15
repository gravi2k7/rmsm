import type { IndicatorCategory } from "./indicator-category.enum";
import type { IndicatorTimeframe } from "./timeframe";

/** One named input parameter an indicator accepts (e.g. EMA's "period"). Distinct from a data dependency (another indicator's output) — see IndicatorMetadata.dependencies for that. */
export interface IndicatorInputSpec {
  name: string;
  type: "number" | "string" | "boolean";
  required: boolean;
  defaultValue?: number | string | boolean;
  /** e.g. { min: 1, max: 500 } for a period parameter — validation.interface.ts's contracts consume this, not a separate parallel spec. */
  constraints?: { min?: number; max?: number; enum?: (string | number)[] };
}

/** One named output series an indicator produces — most indicators produce exactly one (e.g. RSI's single line), but composite indicators (Bollinger Bands: upper/middle/lower; MACD: macd/signal/histogram) produce several, each named. */
export interface IndicatorOutputSpec {
  name: string;
  /** "line" | "histogram" | "band" | "discrete_signal" — a rendering/interpretation hint for future consumers (AI-103+), not something this engine itself interprets. */
  kind: "line" | "histogram" | "band" | "discrete_signal";
}

/**
 * Every field named in this phase's own spec (item 3), exactly:
 * identifier, display name, version, category, inputs, outputs,
 * dependencies, supported timeframes, required lookback, incremental
 * support.
 */
export interface IndicatorMetadata {
  /** Globally unique, stable across versions — e.g. "ema", "macd", "rdse". Used as the registry key (IndicatorRegistry contracts) and as the identifier another indicator's `dependencies` array references. */
  identifier: string;
  displayName: string;
  /** Semver — a breaking change to an indicator's calculation (not just a bugfix) must bump this, since IndicatorResult.metadata (below) records which version produced a given result; a future recalculation-audit or golden-dataset-test comparison depends on this being trustworthy. */
  version: string;
  category: IndicatorCategory;
  inputs: IndicatorInputSpec[];
  outputs: IndicatorOutputSpec[];
  /** Other indicators' `identifier`s this indicator's calculation consumes as input (MACD depending on two EMAs, per this phase's own dependency-graph example). Empty for an indicator that only consumes raw candles. */
  dependencies: string[];
  supportedTimeframes: IndicatorTimeframe[];
  /** How many prior candles this indicator needs before it can produce its first valid value (e.g. a 200-period SMA needs 200 prior candles) — the concrete input `dependency-graph`/`computation` contracts use to determine how far back a calculation must reach. */
  requiredLookback: number;
  /** Whether this indicator can update its latest value from just the newest candle plus its own previously-cached state, rather than needing to recompute over `requiredLookback` candles again (item 9's "avoid recalculating entire history") — a capability flag the computation engine contracts check before choosing a full-recalculation vs. incremental-update execution path. */
  supportsIncrementalCalculation: boolean;
}
