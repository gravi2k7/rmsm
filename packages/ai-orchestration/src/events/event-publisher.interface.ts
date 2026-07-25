import type { OrchestrationDomainEvent } from "./orchestration-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly OrchestrationDomainEvent[]): Promise<void>;
}
