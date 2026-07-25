import type { EventPublisher } from "../events/event-publisher.interface";
import type { TranslationDomainEvent } from "../events/translation-domain-events.interface";

export type TranslationEventListener = (event: TranslationDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: TranslationEventListener[] = [];

  subscribe(listener: TranslationEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly TranslationDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
