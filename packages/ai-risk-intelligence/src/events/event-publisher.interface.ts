import type { RiskIntelligenceDomainEvent } from "./risk-intelligence-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly RiskIntelligenceDomainEvent[]): Promise<void>;
}
