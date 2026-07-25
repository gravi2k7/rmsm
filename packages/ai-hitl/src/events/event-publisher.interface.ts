import type { HitlDomainEvent } from "./hitl-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly HitlDomainEvent[]): Promise<void>;
}
