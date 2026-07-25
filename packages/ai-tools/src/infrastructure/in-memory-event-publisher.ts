import type { EventPublisher } from "../events/event-publisher.interface";
import type { ToolDomainEvent } from "../events/tool-domain-events.interface";

export type ToolEventListener = (event: ToolDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: ToolEventListener[] = [];

  subscribe(listener: ToolEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly ToolDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
