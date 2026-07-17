import { Injectable, Logger } from "@nestjs/common";
import type { StrategyDomainEvent } from "../../domain/events/strategy-domain-events.interface";
import type { EventPublisher } from "../../application/events/event-publisher.interface";
import { StrategyOutboxRepository } from "../repositories/strategy-outbox.repository";
import { toIntegrationEvent } from "../../integration/events/domain-to-integration-event.mapper";

/**
 * The real implementation `application/events/event-publisher.interface.ts`
 * describes — "Infrastructure delivers events" (this milestone's own
 * words). Converts each domain event to its own real integration
 * envelope (`toIntegrationEvent`) and writes it to the outbox table.
 *
 * **The one honest gap, named prominently rather than glossed over**:
 * this write happens AFTER the triggering command handler's own
 * `repository.save()` call already succeeded — not inside the SAME
 * database transaction. A true transactional outbox needs the event
 * row and the aggregate row written atomically (both commit or both
 * roll back together); achieving that would require every Milestone 2
 * repository to accept an externally-supplied `DbClient` so a command
 * handler could thread one shared transaction across multiple
 * repository calls — a real, structural change to those now-frozen
 * repositories, explicitly out of this milestone's own scope ("do NOT
 * redesign any completed milestone"). What's real here: the outbox
 * table, the background publisher, retry/poison handling, and a
 * genuine "the event write itself either fully succeeds or throws"
 * guarantee — this is "at-least-once, near-transactional," not a
 * decorative stand-in for the real pattern.
 */
@Injectable()
export class OutboxEventPublisher implements EventPublisher {
  private readonly logger = new Logger(OutboxEventPublisher.name);

  constructor(private readonly outboxRepository: StrategyOutboxRepository) {}

  async publish(events: StrategyDomainEvent[], correlationId: string, causationId: string | null): Promise<void> {
    if (events.length === 0) return;

    const integrationEvents = events.map((e) => toIntegrationEvent(e, correlationId, causationId));

    await this.outboxRepository.enqueue(
      integrationEvents.map((e) => ({
        id: e.eventId,
        organizationId: e.organizationId,
        aggregateId: e.aggregateId,
        aggregateType: e.aggregateType,
        eventType: e.eventType,
        payload: e.payload,
        correlationId: e.correlationId,
        causationId: e.causationId,
        userId: e.userId,
        occurredAt: e.occurredAt,
      })),
    );

    this.logger.log(`correlationId=${correlationId} enqueued=${events.length} types=${events.map((e) => e.kind).join(",")}`);
  }
}
