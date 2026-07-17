import type { StrategyDomainEvent } from "../../domain/events/strategy-domain-events.interface";

/**
 * The application layer's own real contract — "Application publishes
 * events. Infrastructure delivers events." (this milestone's own
 * Architecture section, verbatim). Command handlers depend on THIS
 * interface only, never on the outbox table or any delivery mechanism
 * directly — the same dependency-inversion discipline every repository
 * interface in this project has followed since AI-103 Milestone 1
 * (`domain/repositories/*.interface.ts`).
 */
export interface EventPublisher {
  /**
   * Publish one or more domain events produced by the SAME logical
   * operation — "Support multiple events within a transaction" (this
   * milestone's own rule), e.g. `PublishVersionHandler` produces both
   * a `StrategyPublishedEvent` and a `StrategyVersionPublishedEvent`
   * from one call. `causationId` is the id of whatever REQUEST caused
   * this batch (typically the platform's own `requestId`); every event
   * in the batch shares the same `correlationId`, and the first event's
   * own `eventId` becomes later events' `causationId` when they're
   * genuinely a chain reaction of each other — for a simple batch from
   * one handler call, all events share the same `causationId` (the
   * originating request), not a per-event chain.
   */
  publish(events: StrategyDomainEvent[], correlationId: string, causationId: string | null): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol("EVENT_PUBLISHER");
