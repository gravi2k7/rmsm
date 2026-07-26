import type { EventPublisher } from "../events/event-publisher.interface";
import type { SignalIntelligenceDomainEvent } from "../events/signal-intelligence-domain-events.interface";

export type SignalIntelligenceEventListener = (event: SignalIntelligenceDomainEvent) => void;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners = new Set<SignalIntelligenceEventListener>();

  subscribe(listener: SignalIntelligenceEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publish(events: readonly SignalIntelligenceDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) listener(event);
    }
  }
}
