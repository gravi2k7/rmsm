/**
 * Service exceptions (item 12) — a SIXTH standardized error hierarchy
 * in this project now (following AI-101's `MarketDataValidationError`;
 * AI-102's `IndicatorValidationError`, `RegistryValidationError`,
 * `ExecutionError`, `GraphError`, and now `ServiceError`). This
 * hierarchy answers "what went wrong at the SERVICE (orchestration)
 * layer" — the outermost layer a future consumer actually sees, wrapping
 * whichever inner-layer error (registry, execution, graph) actually
 * caused it, per `RegistryServiceException`'s/`PlannerServiceException`'s
 * own comments below.
 */
export abstract class ServiceError extends Error {
  abstract readonly code: string;
  readonly context: Record<string, unknown>;
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.context = context;
  }
}

export class IndicatorServiceException extends ServiceError {
  readonly code = "IndicatorService";
}
export class ExecutionServiceException extends ServiceError {
  readonly code = "ExecutionService";
}
export class ValidationServiceException extends ServiceError {
  readonly code = "ValidationService";
}
/** Wraps a registry-layer failure (Phase 2A) surfaced through the service layer — the service-layer counterpart to Phase 2C's own RegistryException (execution.errors.ts), one level further out. */
export class RegistryServiceException extends ServiceError {
  readonly code = "RegistryService";
}
/** Wraps a Phase 2C planning-layer failure (GraphError subclasses) surfaced through the service layer. */
export class PlannerServiceException extends ServiceError {
  readonly code = "PlannerService";
}
