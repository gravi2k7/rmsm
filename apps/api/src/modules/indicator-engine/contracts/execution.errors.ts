/**
 * Structured exceptions (item 10) — a FOURTH standardized error
 * hierarchy in this project now (AI-101's `MarketDataValidationError`,
 * AI-102 Phase 1's `IndicatorValidationError`, AI-102 Phase 2A's
 * `RegistryValidationError`, and this phase's `ExecutionError`).
 * Deliberately distinct from all three — this hierarchy answers "what
 * went wrong while actually RUNNING an execution," a different
 * lifecycle stage than "is this definition well-formed" (registration-
 * time) or "is this request valid against a definition" (pre-execution
 * validation). `RegistryException` (item 10's own name) is the one
 * exception in this file that WRAPS a failure from a different layer
 * (the registry) rather than originating here — kept in this file
 * anyway since item 10 explicitly lists it as part of this phase's own
 * exception model, not the registry's.
 */
export abstract class ExecutionError extends Error {
  abstract readonly code: string;
  readonly context: Record<string, unknown>;
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.context = context;
  }
}

export class IndicatorNotFoundException extends ExecutionError {
  readonly code = "IndicatorNotFound";
}
export class InvalidParameterException extends ExecutionError {
  readonly code = "InvalidParameter";
}
export class UnsupportedTimeframeException extends ExecutionError {
  readonly code = "UnsupportedTimeframe";
}
export class CalculationWindowException extends ExecutionError {
  readonly code = "CalculationWindow";
}
export class ExecutionTimeoutException extends ExecutionError {
  readonly code = "ExecutionTimeout";
}
export class ExecutionCancelledException extends ExecutionError {
  readonly code = "ExecutionCancelled";
}
/** Wraps a registry-layer failure (e.g. a NotFoundError from IndicatorRegistryService.get()) encountered while preparing an execution — distinct from IndicatorNotFoundException, which this engine throws directly when it already knows the identifier is the problem; RegistryException is for a lower-level registry failure this engine didn't originate but must still surface in its own exception vocabulary. */
export class RegistryException extends ExecutionError {
  readonly code = "Registry";
}
