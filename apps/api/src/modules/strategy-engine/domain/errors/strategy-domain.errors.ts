/**
 * Standardized domain error hierarchy — the SEVENTH such hierarchy in
 * this platform now (AI-101's `MarketDataValidationError`; AI-102's
 * `IndicatorValidationError`, `RegistryValidationError`,
 * `ExecutionError`, `GraphError`, `ServiceError`; and now
 * `StrategyDomainError`). Every one of this project's domain error
 * hierarchies answers a DIFFERENT question at a DIFFERENT layer — this
 * one answers "what domain invariant did an aggregate's own method
 * refuse to violate," the innermost layer of all of them (a pure
 * domain-model concern, with no framework/transport dependency
 * whatsoever — this file imports nothing from `@nestjs/common` or any
 * other infrastructure package, deliberately, since a domain model
 * should be usable and testable with zero framework coupling).
 */
export abstract class StrategyDomainError extends Error {
  abstract readonly code: string;
  readonly context: Record<string, unknown>;
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.context = context;
  }
}

export class InvalidVersionTransitionError extends StrategyDomainError {
  readonly code = "InvalidVersionTransition";
}
export class ImmutablePublishedVersionError extends StrategyDomainError {
  readonly code = "ImmutablePublishedVersion";
}
export class InvalidStrategyStateError extends StrategyDomainError {
  readonly code = "InvalidStrategyState";
}
export class DuplicateTagError extends StrategyDomainError {
  readonly code = "DuplicateTag";
}
export class InvalidTagFormatError extends StrategyDomainError {
  readonly code = "InvalidTagFormat";
}
export class EmptyRuleGroupError extends StrategyDomainError {
  readonly code = "EmptyRuleGroup";
}
