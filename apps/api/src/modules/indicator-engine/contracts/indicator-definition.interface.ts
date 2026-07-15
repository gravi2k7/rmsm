import type { IndicatorCategory } from "./indicator-category.enum";
import type { IndicatorTimeframe } from "./timeframe";
import type { ParameterDefinition, ParameterValue } from "./parameter-definition.interface";
import type { IndicatorMetadata } from "./indicator-metadata.interface";

/** One named output series an indicator produces — most indicators produce exactly one (e.g. RSI's single line), but composite indicators (Bollinger Bands: upper/middle/lower; MACD: macd/signal/histogram) produce several, each named. Relocated here from indicator-metadata.interface.ts in this phase's restructuring — outputs are a structural property of a definition, the same category as inputs, not a capability flag. */
export interface IndicatorOutputSpec {
  name: string;
  kind: "line" | "histogram" | "band" | "discrete_signal";
}

/** "experimental" | "stable" | "deprecated" (item 2's own named field) — a real, checkable signal a future discovery UI (AI-103+) or RegistryValidatorService itself can act on (e.g. warn when instantiating a "deprecated" definition), not just documentation prose. */
export type IndicatorStabilityLevel = "experimental" | "stable" | "deprecated";

/**
 * The canonical, immutable template — "EMA version 1.0.0," per this
 * phase's own explicit architectural improvement request: "never
 * changes at runtime." A real Phase 2A implementation enforces this
 * with `Object.freeze()` at registration time (`IndicatorRegistryService`),
 * not just by convention — see AI102_PHASE2A.md's "Immutability,
 * Enforced Structurally" section for how.
 *
 * Every field item 2 named, directly:
 */
export interface IndicatorDefinition {
  identifier: string;
  displayName: string;
  /** Semver — see indicator-metadata.interface.ts's own header comment for why this stays a single, top-level field rather than being duplicated into the embedded IndicatorMetadata too. */
  version: string;
  description: string;
  category: IndicatorCategory;
  inputs: ParameterDefinition[];
  outputs: IndicatorOutputSpec[];
  defaultParameters: Record<string, ParameterValue>;
  supportedTimeframes: IndicatorTimeframe[];
  minimumLookback: number;
  /** Other IndicatorDefinition identifiers this one's calculation consumes as input — MACD depending on two EMAs (Phase 1's own worked example), unchanged from Phase 1's `dependencies` field, just relocated onto the new top-level definition object. */
  dependencies: string[];
  tags: string[];
  author: string;
  stabilityLevel: IndicatorStabilityLevel;
  /** The narrowed calculation-characteristic flags (documentation, calculationType, deterministic, cacheable) — see indicator-metadata.interface.ts's own header comment for the full reasoning behind this split. */
  metadata: IndicatorMetadata;
}
