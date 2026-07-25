import type { MemoryDomainEvent } from "./memory-domain-events.interface";

/**
 * "Application publishes events. Infrastructure delivers events." — the
 * same contract AI-103 established
 * (`application/events/event-publisher.interface.ts`), reused here by
 * the same name and shape. `MemoryService`/`ConversationService` depend
 * on THIS interface only, never on a concrete delivery mechanism — this
 * is the seam AI-204 (or any future consumer) hooks into via
 * `implements EventPublisher`, satisfying "AI-204 may observe AI-203
 * through events or interfaces; AI-203 must NOT depend on AI-204" ---
 * this package has no knowledge that `@rmsm/ai-observability` exists.
 */
export interface EventPublisher {
  publish(events: readonly MemoryDomainEvent[]): Promise<void>;
}
