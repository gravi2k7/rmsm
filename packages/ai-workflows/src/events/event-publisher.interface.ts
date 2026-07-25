import type { WorkflowDomainEvent } from "./workflow-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly WorkflowDomainEvent[]): Promise<void>;
}
