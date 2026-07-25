import type { EmbeddingDomainEvent } from "./embedding-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly EmbeddingDomainEvent[]): Promise<void>;
}
