/**
 * Abstraction over "now". Domain/application code that needs the current
 * time depends on this instead of calling `new Date()`/`Date.now()`
 * directly, so tests can supply a fixed clock instead of relying on real
 * wall-clock time.
 */
export interface Clock {
  now(): Date;
}

/** The real implementation — a thin wrapper, deliberately the only place
 * in `@rmsm/core` that touches the actual system clock. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** Abstraction over unique-id generation, for the same testability reason
 * as `Clock` — domain code depending on this instead of calling
 * `crypto.randomUUID()` directly can be tested with deterministic ids. */
export interface IdGenerator {
  generate(): string;
}
