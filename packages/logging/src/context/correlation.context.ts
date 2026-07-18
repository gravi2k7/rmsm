import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

/**
 * Propagates a correlation id across an async call chain (e.g. one HTTP
 * request's full lifecycle: middleware → controller → service → repository)
 * without threading it through every function signature. Built on Node's
 * own `AsyncLocalStorage` — no external dependency.
 *
 * This is deliberately a *correlation* id (one per logical request/
 * operation, platform-wide convention already established — see AI-103's
 * own `correlationId` threaded from `req.requestId`), not a distributed-
 * trace id; see `trace.context.ts` for that distinct concept.
 */
export class CorrelationContext {
  private static readonly storage = new AsyncLocalStorage<string>();

  /** Runs `fn` with `correlationId` available to every nested call via
   * {@link CorrelationContext.get}, for the duration of `fn` (including
   * across any `await`s inside it) only. */
  static run<T>(correlationId: string, fn: () => T): T {
    return CorrelationContext.storage.run(correlationId, fn);
  }

  /** Returns the correlation id for the current async context, or
   * `undefined` if {@link CorrelationContext.run} hasn't been called
   * anywhere in this call chain (e.g. code running outside a request). */
  static get(): string | undefined {
    return CorrelationContext.storage.getStore();
  }

  /** Generates a new correlation id. Uses `crypto.randomUUID()` (built
   * into Node, no dependency) — callers that already have an id from an
   * inbound request header should use that instead of generating a new
   * one, to preserve correlation across service boundaries. */
  static generate(): string {
    return randomUUID();
  }
}
