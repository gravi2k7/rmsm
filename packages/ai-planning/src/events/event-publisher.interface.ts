import type { PlanningDomainEvent } from "./planning-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly PlanningDomainEvent[]): Promise<void>;
}
