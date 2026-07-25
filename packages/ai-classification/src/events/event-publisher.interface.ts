import type { ClassificationDomainEvent } from "./classification-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly ClassificationDomainEvent[]): Promise<void>;
}
