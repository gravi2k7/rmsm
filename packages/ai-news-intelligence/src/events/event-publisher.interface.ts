import type { NewsIntelligenceDomainEvent } from "./news-intelligence-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly NewsIntelligenceDomainEvent[]): Promise<void>;
}
