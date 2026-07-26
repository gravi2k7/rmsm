import type { SignalIntelligenceDomainEvent } from "./signal-intelligence-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly SignalIntelligenceDomainEvent[]): Promise<void>;
}
