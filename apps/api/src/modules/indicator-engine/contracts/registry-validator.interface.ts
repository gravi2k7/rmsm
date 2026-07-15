import type { IndicatorDefinition } from "./indicator-definition.interface";
import type { IndicatorRegistry } from "./indicator-registry.interface";

/**
 * Registration-time validation (item 8) — runs once, when
 * `IndicatorRegistry.register()` is called, before a definition is
 * ever added to the registry's own storage. A definition that fails
 * here is never registered at all — the registry has no concept of a
 * "provisionally registered" or "invalid but present" definition.
 */
export interface RegistryValidator {
  /**
   * All 7 checks item 8 names, run together (not exposed as 7 separate
   * methods) — registering a definition is one atomic
   * pass-or-reject operation, not a pipeline a caller steps through
   * manually. Throws the first `RegistryValidationError` subclass
   * encountered (`registry-validation.errors.ts`) rather than
   * collecting every violation — a definition author fixes one
   * problem, re-registers, and finds out about the next one, the same
   * "fail fast on the first real problem" discipline this project's
   * DTO validation (class-validator) already uses elsewhere, applied
   * here to a different validation mechanism.
   */
  validate(definition: IndicatorDefinition, registry: IndicatorRegistry): void;
}
