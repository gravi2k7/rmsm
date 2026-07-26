import type { MarketIntelligenceDomainEvent } from "./market-intelligence-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly MarketIntelligenceDomainEvent[]): Promise<void>;
}
