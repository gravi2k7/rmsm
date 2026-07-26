import type { StrategyIntelligenceDomainEvent } from "./strategy-intelligence-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly StrategyIntelligenceDomainEvent[]): Promise<void>;
}
