import type { AgentWorkflowDomainEvent } from "./agent-workflow-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly AgentWorkflowDomainEvent[]): Promise<void>;
}
