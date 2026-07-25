import type { RagDomainEvent } from "./rag-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly RagDomainEvent[]): Promise<void>;
}
