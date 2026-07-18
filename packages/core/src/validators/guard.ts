import { InvariantViolationError } from "../errors/domain-error";

/**
 * Static invariant-checking helpers for use in entity/value-object
 * constructors and domain methods. Each throws `InvariantViolationError`
 * on failure rather than returning a boolean — construction-time
 * invariants are exactly the case where "this object must not exist in
 * an invalid state" is the desired behavior, as opposed to
 * `Specification` (see `contracts/specification.ts`), which is for
 * business rules a caller wants to *check without failing*.
 */
export class Guard {
  static againstNullOrUndefined(value: unknown, fieldName: string): void {
    if (value === null || value === undefined) {
      throw new InvariantViolationError(`${fieldName} must not be null or undefined.`);
    }
  }

  static againstEmptyString(value: string, fieldName: string): void {
    if (value.trim().length === 0) {
      throw new InvariantViolationError(`${fieldName} must not be empty.`);
    }
  }

  static againstOutOfRange(value: number, min: number, max: number, fieldName: string): void {
    if (value < min || value > max) {
      throw new InvariantViolationError(`${fieldName} must be between ${min} and ${max} (got ${value}).`);
    }
  }

  static againstNegative(value: number, fieldName: string): void {
    if (value < 0) {
      throw new InvariantViolationError(`${fieldName} must not be negative (got ${value}).`);
    }
  }

  static againstEmptyArray<T>(value: readonly T[], fieldName: string): void {
    if (value.length === 0) {
      throw new InvariantViolationError(`${fieldName} must not be empty.`);
    }
  }

  /** Asserts a condition holds, with a caller-supplied message — the
   * escape hatch for invariants the other, named guards don't cover. */
  static ensure(condition: boolean, message: string): void {
    if (!condition) {
      throw new InvariantViolationError(message);
    }
  }
}
