import type { AgentRegistryDomainEvent } from "./agent-registry-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly AgentRegistryDomainEvent[]): Promise<void>;
}
