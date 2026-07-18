/**
 * Explicit success/failure type for domain-layer operations that can fail
 * in an expected, non-exceptional way (e.g. "this rule tree fails
 * validation") — as opposed to throwing a `DomainError` for a genuine
 * invariant violation.
 *
 * `@rmsm/shared` already exports a `Result<T, E>` — this is a deliberate,
 * separate copy, not an oversight. `@rmsm/core` is the platform's
 * shared domain kernel: every future domain module (Strategy, Scanner,
 * Portfolio, ...) depends on it, so it must not itself depend on
 * `@rmsm/shared` or anything else — the same "zero dependencies down"
 * discipline `@rmsm/shared`'s own `json.ts` documents for why it doesn't
 * depend on `@prisma/client`. The two `Result` types are structurally
 * identical by design, so a value produced by one is assignable to the
 * other's shape without a cast if a call site ever needs to bridge them.
 */
export type Result<T, E = DomainFailure> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

/** Minimal, structured failure shape for `Result.error` — a lighter
 * alternative to throwing a `DomainError` when the caller is expected to
 * branch on the outcome rather than propagate an exception. */
export interface DomainFailure {
  readonly code: string;
  readonly message: string;
}

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Narrows a `Result<T, E>` to its success branch, throwing `error` if it
 * was actually a failure. For call sites that have already decided a
 * failure at this point is unrecoverable and should propagate as an
 * exception rather than be handled inline. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}
