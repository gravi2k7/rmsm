import type { AgentMemoryDomainEvent } from "./agent-memory-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly AgentMemoryDomainEvent[]): Promise<void>;
}
