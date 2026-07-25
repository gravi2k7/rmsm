import type { SummarizationDomainEvent } from "./summarization-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly SummarizationDomainEvent[]): Promise<void>;
}
