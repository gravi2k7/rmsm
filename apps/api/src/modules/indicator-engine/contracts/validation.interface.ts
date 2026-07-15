/**
 * Validation rules named in this phase's own spec (item 11): indicator
 * inputs, parameters, lookback, dependencies, timeframes. Mirrors the
 * standardized-error-model discipline AI-101 Phase 2C established
 * (`MarketDataValidationError`, ADR-027) — a parallel, equally
 * deliberately-named hierarchy here, not a reuse of AI-101's own error
 * classes, since AI-102's validation concerns (a bad indicator
 * parameter, an unsupported timeframe, a missing dependency) are a
 * genuinely different domain than AI-101's (a bad OHLC value, an
 * invalid symbol) even though the shape of "validate, don't repair"
 * carries over identically.
 */
export abstract class IndicatorValidationError extends Error {
  abstract readonly code: string;
  readonly context: Record<string, unknown>;
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.context = context;
  }
}

export class InvalidParameterError extends IndicatorValidationError {
  readonly code = "InvalidParameter";
}
export class InsufficientLookbackError extends IndicatorValidationError {
  readonly code = "InsufficientLookback";
}
export class UnresolvedDependencyError extends IndicatorValidationError {
  readonly code = "UnresolvedDependency";
}
export class UnsupportedTimeframeError extends IndicatorValidationError {
  readonly code = "UnsupportedTimeframe";
}

export interface IndicatorValidator {
  /** Checks a requested parameter set against IndicatorMetadata.inputs' constraints — required-ness, min/max/enum. */
  validateParameters(metadata: import("./indicator-metadata.interface").IndicatorMetadata, parameters: Record<string, number | string | boolean>): void;
  /** Checks that the candle range actually supplied covers at least metadata.requiredLookback before the requested range starts. */
  validateLookback(metadata: import("./indicator-metadata.interface").IndicatorMetadata, candleCount: number): void;
  /** Checks metadata.dependencies all resolve to a registered indicator — an indicator whose registered dependency identifier no longer exists (e.g. deregistered) fails here before any calculation is attempted. */
  validateDependencies(metadata: import("./indicator-metadata.interface").IndicatorMetadata, registry: import("./indicator-registry.interface").IndicatorRegistry): void;
  /** Checks the requested timeframe is in metadata.supportedTimeframes. */
  validateTimeframe(metadata: import("./indicator-metadata.interface").IndicatorMetadata, timeframe: import("./timeframe").IndicatorTimeframe): void;
}
