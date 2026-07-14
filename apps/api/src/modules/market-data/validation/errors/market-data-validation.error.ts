/**
 * Standardized validation errors for the normalization/validation layer
 * — Phase 2C's explicit error model, deliberately named
 * `MarketDataValidationError`, not `ValidationError`. `@rmsm/shared`
 * already exports a `ValidationError` class (HTTP-error-oriented, thrown
 * by services and caught by the global exception filter to produce a 400
 * response, used throughout every EP module). Reusing that exact name
 * here — for a domain-specific, no-HTTP-semantics error hierarchy meant
 * to be thrown by pure functions with no request/response context at
 * all — would create real confusion the first time someone imports both
 * in the same file. A deliberate naming choice, flagged rather than
 * silently colliding.
 *
 * No provider-specific exception subclasses exist anywhere in this
 * hierarchy, per Phase 2C's explicit rule — a Binance payload and a
 * Polygon payload that both fail OHLC validation raise the exact same
 * `InvalidOhlcError`, distinguishable only by the generic `context`
 * payload each error carries (which itself contains no provider-specific
 * TYPE, just plain data).
 */
export abstract class MarketDataValidationError extends Error {
  abstract readonly code: string;
  readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.context = context;
  }
}

export class InvalidTimestampError extends MarketDataValidationError {
  readonly code = "InvalidTimestamp";
}

export class InvalidOhlcError extends MarketDataValidationError {
  readonly code = "InvalidOHLC";
}

export class InvalidVolumeError extends MarketDataValidationError {
  readonly code = "InvalidVolume";
}

export class DuplicateRecordError extends MarketDataValidationError {
  readonly code = "DuplicateRecord";
}

export class InvalidProviderPayloadError extends MarketDataValidationError {
  readonly code = "InvalidProviderPayload";
}

export class InvalidSymbolError extends MarketDataValidationError {
  readonly code = "InvalidSymbol";
}

export class InvalidPrecisionError extends MarketDataValidationError {
  readonly code = "InvalidPrecision";
}

export class InvalidTimezoneError extends MarketDataValidationError {
  readonly code = "InvalidTimezone";
}
