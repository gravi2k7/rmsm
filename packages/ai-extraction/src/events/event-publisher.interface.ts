import type { ExtractionDomainEvent } from "./extraction-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly ExtractionDomainEvent[]): Promise<void>;
}
