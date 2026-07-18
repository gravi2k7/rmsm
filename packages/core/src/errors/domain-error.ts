/**
 * Abstract base for every domain-layer error in the platform.
 *
 * Deliberately has no `statusCode` — that's an HTTP/application-layer
 * concern, not a domain one. Each owning module maps its own domain error
 * hierarchy to HTTP status via a dedicated exception filter keyed on
 * `code` (the established platform convention — see e.g. AI-103's
 * `StrategyDomainError` / `StrategyApplicationError`), never a long
 * `instanceof` chain and never by having the domain layer itself know
 * about HTTP.
 *
 * `@rmsm/shared`'s own `AppError` *does* carry a `statusCode` — that one
 * is the application/API-layer error base. `DomainError` is its distinct,
 * lower-level counterpart: usable by a domain layer that must not depend
 * on anything HTTP-shaped, including a package (`@rmsm/shared`) that
 * models HTTP status codes as a first-class concept.
 */
export abstract class DomainError extends Error {
  /** Stable, greppable identifier — the contract other layers key off of, not `message`. */
  public readonly code: string;

  protected constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/** A required invariant of an entity/value object/aggregate was violated
 * during construction or mutation (e.g. an empty required field, an
 * out-of-range value). Distinct from application-layer input validation —
 * this fires *after* input has already been accepted for processing, when
 * a domain rule itself rejects it. */
export class InvariantViolationError extends DomainError {
  constructor(message: string) {
    super(message, "INVARIANT_VIOLATION");
  }
}

/** A referenced entity does not exist. Domain-layer counterpart to
 * `@rmsm/shared`'s `NotFoundError` — this one carries no HTTP status,
 * since the domain layer itself has no concept of HTTP. */
export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} (${id}) was not found.`, "ENTITY_NOT_FOUND");
  }
}

/** An operation was attempted against stale data — the aggregate has
 * changed since it was loaded (optimistic-concurrency conflict). */
export class ConcurrencyConflictError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} (${id}) was modified by another operation. Reload and retry.`, "CONCURRENCY_CONFLICT");
  }
}

/** An operation was attempted that the current state of the aggregate
 * does not permit (e.g. an illegal state-machine transition). */
export class IllegalStateTransitionError extends DomainError {
  constructor(entityName: string, fromState: string, attemptedTransition: string) {
    super(`${entityName} in state "${fromState}" cannot perform "${attemptedTransition}".`, "ILLEGAL_STATE_TRANSITION");
  }
}
