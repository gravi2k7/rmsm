import type { EventPublisher } from "../events/event-publisher.interface";
import type { StrategyIntelligenceDomainEvent } from "../events/strategy-intelligence-domain-events.interface";

export type StrategyIntelligenceEventListener = (event: StrategyIntelligenceDomainEvent) => void;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners = new Set<StrategyIntelligenceEventListener>();

  subscribe(listener: StrategyIntelligenceEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publish(events: readonly StrategyIntelligenceDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) listener(event);
    }
  }
}
