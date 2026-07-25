import type { ResearchDomainEvent } from "./research-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly ResearchDomainEvent[]): Promise<void>;
}
