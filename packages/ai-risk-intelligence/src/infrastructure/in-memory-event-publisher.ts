import type { EventPublisher } from "../events/event-publisher.interface";
import type { RiskIntelligenceDomainEvent } from "../events/risk-intelligence-domain-events.interface";

export type RiskIntelligenceEventListener = (event: RiskIntelligenceDomainEvent) => void;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners = new Set<RiskIntelligenceEventListener>();

  subscribe(listener: RiskIntelligenceEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publish(events: readonly RiskIntelligenceDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) listener(event);
    }
  }
}
