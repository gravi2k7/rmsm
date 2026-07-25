import type { EventPublisher } from "../events/event-publisher.interface";
import type { AgentMemoryDomainEvent } from "../events/agent-memory-domain-events.interface";

export type AgentMemoryEventListener = (event: AgentMemoryDomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: AgentMemoryEventListener[] = [];

  subscribe(listener: AgentMemoryEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly AgentMemoryDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
