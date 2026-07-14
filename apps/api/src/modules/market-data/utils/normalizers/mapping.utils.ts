import { InvalidProviderPayloadError } from "../../validation/errors/market-data-validation.error";

/**
 * Small, reusable helpers every entity normalizer below is built on —
 * Phase 2C's explicit "avoid duplicated normalization code" requirement.
 * Each one is a pure function with no side effects, matching the
 * deterministic-normalization requirement for the whole layer.
 */

/** Fails loudly (InvalidProviderPayloadError) rather than silently coercing an absent required field to a default — a missing required field is a real data-quality problem, not something a normalizer should paper over. */
export function requireField<T>(value: T | null | undefined, fieldName: string, payload: unknown): T {
  if (value === null || value === undefined || value === "") {
    throw new InvalidProviderPayloadError(`Required field "${fieldName}" is missing or empty.`, { fieldName, payload });
  }
  return value;
}

/** Same as requireField, but for values allowed to be absent — returns a typed null instead of throwing, still without ever coercing "0" or "false" (falsy-but-valid values) to null. */
export function optionalField<T>(value: T | null | undefined): T | null {
  return value === undefined ? null : value;
}

/** Trims and uppercases a code-like string (exchange codes, currency codes) — the one normalization every such field shares, extracted once rather than repeated in every entity normalizer that touches a code field. */
export function normalizeCode(value: string, fieldName: string, payload: unknown): string {
  const trimmed = requireField(value, fieldName, payload).trim();
  if (!trimmed) {
    throw new InvalidProviderPayloadError(`"${fieldName}" cannot be blank after trimming.`, { fieldName, payload });
  }
  return trimmed.toUpperCase();
}
