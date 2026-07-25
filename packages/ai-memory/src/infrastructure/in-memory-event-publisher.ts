import type { EventPublisher } from "../events/event-publisher.interface";
import type { MemoryDomainEvent } from "../events/memory-domain-events.interface";

export type MemoryEventListener = (event: MemoryDomainEvent) => void | Promise<void>;

/**
 * The real, default `EventPublisher` — delivers events synchronously, in
 * order, to every subscribed listener; keeps no history. This is the
 * concrete seam a future observer (AI-204's own tracing adapter, or any
 * other consumer) attaches to via `subscribe()` — the "infrastructure
 * delivers events" half of the "application publishes, infrastructure
 * delivers" split this package's `EventPublisher` interface documents.
 * `@rmsm/ai-memory` has no idea `@rmsm/ai-observability` exists;
 * `subscribe()` is a generic capability any consumer can use.
 */
export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: MemoryEventListener[] = [];

  /** Registers a listener, returning an unsubscribe function. */
  subscribe(listener: MemoryEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  async publish(events: readonly MemoryDomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const listener of this.listeners) {
        await listener(event);
      }
    }
  }
}
