import type { TelemetryPublisher } from "../events/telemetry-publisher.interface";
import type { ObservabilityDomainEvent } from "../events/observability-domain-events.interface";

/**
 * The real, default `TelemetryPublisher` — writes one structured JSON
 * line per event to stdout via `console.log`. This is deliberately the
 * ONLY concrete `TelemetryPublisher` this package ships: a future
 * OTel/Prometheus/Grafana exporter is a separate adapter of the same
 * interface, not something this package needs to anticipate further
 * than "the interface already supports it."
 */
export class ConsoleTelemetryPublisher implements TelemetryPublisher {
  async publish(events: readonly ObservabilityDomainEvent[]): Promise<void> {
    for (const event of events) {
      // eslint-disable-next-line no-console -- this class's entire purpose is structured console output
      console.log(
        JSON.stringify({
          ...event,
          occurredAt: event.occurredAt.toISOString(),
        }),
      );
    }
  }
}
