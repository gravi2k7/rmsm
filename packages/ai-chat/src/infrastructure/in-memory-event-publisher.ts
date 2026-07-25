import type { EventPublisher } from "../events/event-publisher.interface";
import type { ChatDomainEvent } from "../events/chat-domain-events.interface";

export type ChatEventListener = (event: ChatDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: ChatEventListener[] = [];

  subscribe(listener: ChatEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly ChatDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
