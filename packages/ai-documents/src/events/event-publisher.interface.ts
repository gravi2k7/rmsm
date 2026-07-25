import type { DocumentDomainEvent } from "./document-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly DocumentDomainEvent[]): Promise<void>;
}
