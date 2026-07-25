import type { ObservabilityDomainEvent } from "./observability-domain-events.interface";

/** Same "application publishes, infrastructure delivers" split
 * `@rmsm/ai-memory`'s `EventPublisher` established — AI-204's own
 * services publish through this port, and a concrete infrastructure
 * implementation (console/structured logger today; OTel/Prometheus/
 * Grafana are future adapters of this same interface) does delivery. */
export interface TelemetryPublisher {
  publish(events: readonly ObservabilityDomainEvent[]): Promise<void>;
}
