import type { ChatDomainEvent } from "./chat-domain-events.interface";

/** Same "application publishes, infrastructure delivers" split every
 * AI package in this platform already uses — a future AI-204 adapter
 * can observe this port exactly the way `MemoryEventTracingAdapter`
 * observes `@rmsm/ai-memory`'s. */
export interface EventPublisher {
  publish(events: readonly ChatDomainEvent[]): Promise<void>;
}
