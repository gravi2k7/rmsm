/**
 * Phase 2A restructuring, flagged explicitly (not a silent breaking
 * change): Phase 1's `IndicatorMetadata` held every field an indicator
 * needs — identity, category, inputs/outputs, dependencies, timeframes,
 * lookback, incremental support. Phase 2A's own spec lists two
 * *separate* contracts with overlapping-but-different field sets:
 * "Indicator Definition" (item 2 — identifier, displayName, version,
 * description, category, inputs, outputs, defaultParameters,
 * supportedTimeframes, minimumLookback, dependencies, tags, author,
 * stabilityLevel) and "Indicator Metadata" (item 6 — version, author,
 * documentation, required/optional inputs, calculationType,
 * deterministic flag, incremental support, cacheable flag,
 * dependencies).
 *
 * Resolved by splitting cleanly: `IndicatorDefinition`
 * (`indicator-definition.interface.ts`) is now the full, immutable,
 * top-level registered object — item 2's fields, directly. This file's
 * `IndicatorMetadata` is narrowed to hold only item 6's fields that
 * *aren't* already structural fields on `IndicatorDefinition`
 * (`documentation`, `calculationType`, `deterministic`, `cacheable`) —
 * embedded as `IndicatorDefinition.metadata`, not duplicating
 * `version`/`author`/`dependencies`/`incrementalSupport`, which already
 * exist once, at the definition's own top level. One fact, one place —
 * not the same field declared twice under two names.
 */
export type IndicatorCalculationType = "single_pass" | "iterative" | "windowed";

export interface IndicatorMetadata {
  /** Longer-form documentation (a URL, or extended explanatory text) — distinct from IndicatorDefinition.description's short summary. */
  documentation?: string;
  calculationType: IndicatorCalculationType;
  /** Should always be true per this module's own Core Principles (Phase 1) — modeled as an explicit, checkable flag (not just an assumption) specifically so RegistryValidatorService can reject a definition that declares itself non-deterministic at registration time, a real validation case item 8 names ("malformed metadata"). */
  deterministic: boolean;
  /** Whether this indicator's result is safe to cache — almost always true given `deterministic: true`, but modeled as its own flag since the two are conceptually distinct (a deterministic calculation could still be deliberately marked non-cacheable, e.g. one intentionally sensitive to a "as-of" wall-clock parameter that isn't part of its declared parameter set). */
  cacheable: boolean;
  /** Item 6's own explicit field, carried forward from Phase 1's `IndicatorMetadata.supportsIncrementalCalculation` (renamed here, same concept) — whether this indicator can update its latest value from just the newest candle plus its own previously-cached state, rather than recomputing over the full lookback window (Phase 1's `IncrementalIndicator` contract is what a definition declaring this true must actually implement). */
  incrementalSupport: boolean;
}
