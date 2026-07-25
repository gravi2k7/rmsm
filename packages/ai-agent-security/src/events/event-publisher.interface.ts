import type { AgentSecurityDomainEvent } from "./agent-security-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly AgentSecurityDomainEvent[]): Promise<void>;
}
