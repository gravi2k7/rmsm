import type { EventPublisher } from "../events/event-publisher.interface";
import type { PortfolioIntelligenceDomainEvent } from "../events/portfolio-intelligence-domain-events.interface";

export type PortfolioIntelligenceEventListener = (event: PortfolioIntelligenceDomainEvent) => void;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners = new Set<PortfolioIntelligenceEventListener>();

  subscribe(listener: PortfolioIntelligenceEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publish(events: readonly PortfolioIntelligenceDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) listener(event);
    }
  }
}
