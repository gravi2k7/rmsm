import type { EventPublisher } from "../events/event-publisher.interface";
import type { NewsIntelligenceDomainEvent } from "../events/news-intelligence-domain-events.interface";

export type NewsIntelligenceEventListener = (event: NewsIntelligenceDomainEvent) => void;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners = new Set<NewsIntelligenceEventListener>();

  subscribe(listener: NewsIntelligenceEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publish(events: readonly NewsIntelligenceDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) listener(event);
    }
  }
}
