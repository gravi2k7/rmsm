import type { EventPublisher } from "../events/event-publisher.interface";
import type { BacktestIntelligenceDomainEvent } from "../events/backtest-intelligence-domain-events.interface";

export type BacktestIntelligenceEventListener = (event: BacktestIntelligenceDomainEvent) => void;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners = new Set<BacktestIntelligenceEventListener>();

  subscribe(listener: BacktestIntelligenceEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publish(events: readonly BacktestIntelligenceDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) listener(event);
    }
  }
}
