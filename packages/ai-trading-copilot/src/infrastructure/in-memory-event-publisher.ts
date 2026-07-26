import type { EventPublisher } from "../events/event-publisher.interface";
import type { TradingCopilotDomainEvent } from "../events/trading-copilot-domain-events.interface";

export type TradingCopilotEventListener = (event: TradingCopilotDomainEvent) => void;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners = new Set<TradingCopilotEventListener>();

  subscribe(listener: TradingCopilotEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publish(events: readonly TradingCopilotDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) listener(event);
    }
  }
}
