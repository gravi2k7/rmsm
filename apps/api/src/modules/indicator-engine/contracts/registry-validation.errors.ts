/**
 * Registration-time error model (item 8) — a THIRD standardized error
 * hierarchy in this project (after AI-101's `MarketDataValidationError`,
 * ADR-027, and AI-102 Phase 1's own `IndicatorValidationError`,
 * execution-time). Deliberately a separate class hierarchy from
 * `IndicatorValidationError`, not a shared base — the two answer
 * different questions (is this DEFINITION well-formed vs. is this
 * REQUEST valid against one), per `validation.interface.ts`'s own
 * "Distinct from RegistryValidator" note, and conflating them would
 * make a catch-block unable to tell which phase of an indicator's
 * lifecycle actually failed.
 */
export abstract class RegistryValidationError extends Error {
  abstract readonly code: string;
  readonly context: Record<string, unknown>;
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.context = context;
  }
}

/** Item 8: "duplicate identifiers" — but see registry-validator.interface.ts's own comment: a duplicate (identifier, version) PAIR is rejected; the SAME identifier at a NEW version is not a duplicate (item 7's own explicit multi-version support). */
export class DuplicateDefinitionError extends RegistryValidationError {
  readonly code = "DuplicateDefinition";
}
export class InvalidVersionError extends RegistryValidationError {
  readonly code = "InvalidVersion";
}
export class InvalidParameterDefinitionError extends RegistryValidationError {
  readonly code = "InvalidParameterDefinition";
}
export class InvalidCategoryError extends RegistryValidationError {
  readonly code = "InvalidCategory";
}
/** A definition's own `dependencies` array names an identifier that isn't (yet) registered — checked at registration time, distinct from `IndicatorValidator.validateDependencies` (execution-time re-check of the same concern, in case a dependency was deregistered after this definition was originally registered). */
export class InvalidDependencyError extends RegistryValidationError {
  readonly code = "InvalidDependency";
}
export class UnsupportedTimeframeDefinitionError extends RegistryValidationError {
  readonly code = "UnsupportedTimeframeDefinition";
}
/** A catch-all for a definition missing a required structural field, or one whose embedded IndicatorMetadata itself makes no sense (e.g. `deterministic: false` — rejected outright, since this module's Core Principles require every indicator to be deterministic; there is no legitimate non-deterministic indicator this registry accepts). */
export class MalformedMetadataError extends RegistryValidationError {
  readonly code = "MalformedMetadata";
}
