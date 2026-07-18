import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

/**
 * A trace id + span id pair, propagated the same way `CorrelationContext`
 * propagates a correlation id — via `AsyncLocalStorage`, no manual
 * threading.
 *
 * Distinct concept from a correlation id: a correlation id identifies one
 * logical operation end-to-end (stable across every service it touches);
 * a trace/span pair identifies *this specific unit of work* within a
 * larger distributed trace, and a new span typically starts at each
 * service boundary while the trace id stays constant. This is a
 * deliberately lightweight, dependency-free complement — `apps/api`
 * already has real OpenTelemetry tracing wired in (`tracing.ts`,
 * reused by AI-103's own `OutboxPublisherService`); this context is for
 * code that wants trace-id-shaped correlation in its own logs without
 * pulling in the OTel SDK as a dependency of this package.
 */
export interface TraceInfo {
  readonly traceId: string;
  readonly spanId: string;
}

export class TraceContext {
  private static readonly storage = new AsyncLocalStorage<TraceInfo>();

  static run<T>(trace: TraceInfo, fn: () => T): T {
    return TraceContext.storage.run(trace, fn);
  }

  static get(): TraceInfo | undefined {
    return TraceContext.storage.getStore();
  }

  /** Starts a new span within the current trace (or a brand new trace if
   * none is active) — the pattern for entering a new unit of work, e.g. a
   * downstream service call, while keeping the same `traceId`. */
  static startSpan(): TraceInfo {
    const current = TraceContext.get();
    return { traceId: current?.traceId ?? randomUUID(), spanId: randomUUID() };
  }
}
