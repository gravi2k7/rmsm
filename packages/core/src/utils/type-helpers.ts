/** Exhaustiveness-checking helper for `switch` statements over a union —
 * a call site that reaches the `default` branch with `assertNever(x)`
 * fails to compile if a new union member is added and not handled,
 * turning a silent runtime gap into a compile-time error. */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

/** Type guard narrowing `T | null | undefined` to `T` — for use with
 * `Array.prototype.filter(isDefined)`, which a bare `!= null` inline
 * check doesn't narrow the array's element type for. */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** Recursively makes every property (including nested objects and array
 * elements) readonly — for exposing internal state without allowing
 * external mutation, e.g. a value object's own computed views. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/** Splits an array into fixed-size chunks — the last chunk may be
 * shorter. Useful for batch-processing (e.g. an outbox-style publisher
 * processing events in bounded batches). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be a positive integer.");
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}
