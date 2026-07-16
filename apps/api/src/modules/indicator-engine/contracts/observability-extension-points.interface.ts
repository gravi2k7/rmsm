/**
 * Observability hooks (item 5) — real interfaces, no monitoring
 * platform integration ("Only architecture," this item's own explicit
 * words), the same discipline as every prior phase's own extension-
 * points files (Phase 2B's `extension-points.interface.ts`, Phase 2C's
 * `graph-extension-points.interface.ts`, Phase 3's
 * `service-extension-points.interface.ts`). This is the 4th such file;
 * deliberately not merged with any of the earlier three — an
 * observability HOOK ("where would a real APM/tracing tool plug in")
 * is a different concern than a TRANSPORT extension point (Phase 3's
 * REST/GraphQL/WebSocket hooks) or an EXECUTION extension point (Phase
 * 2B's distributed/parallel/GPU/cluster hooks), even though a real
 * implementation of any of them would likely need to correlate through
 * the same `requestId`/`executionId` this phase's own structured
 * logging already threads through.
 */

/** A future metrics backend (Prometheus, StatsD, CloudWatch, ...) — this module's own real, in-memory counters (ServiceMetricsService, ExecutionMetricsService, GraphMetricsService, from Phases 2B/2C/3) are the real DATA; this is where a real exporter would read from them and push/expose to an actual monitoring platform. */
export interface MetricsExporter {
  exportCounter(name: string, value: number, tags?: Record<string, string>): void;
  exportGauge(name: string, value: number, tags?: Record<string, string>): void;
}

/** A future distributed tracing backend (OpenTelemetry, Jaeger, ...) — spans keyed by the same requestId/executionId this phase's own structured logging already carries, so a real tracing implementation correlates naturally with the log lines an operator would already be reading. */
export interface TracingHook {
  startSpan(name: string, correlationId: string): { end: () => void; setAttribute: (key: string, value: string | number | boolean) => void };
}

/** A future alerting/monitoring platform (PagerDuty, Opsgenie, ...) reading this module's own health check (IndicatorHealthService) and reacting to a `degraded` status — this hook is where that platform-specific integration would live, not inside the health check itself (which stays platform-agnostic, returning a plain DTO any consumer can read). */
export interface MonitoringAlertHook {
  onDegraded(reason: string): void;
  onRecovered(): void;
}

/** A future request-level distributed trace propagation hook — reads/writes the trace context (e.g. W3C traceparent header) a real distributed tracing backend would need, distinct from TracingHook (which starts/ends spans within one already-established trace context). */
export interface DistributedTracingPropagator {
  extractContext(headers: Record<string, string>): string | null;
  injectContext(correlationId: string, headers: Record<string, string>): void;
}
