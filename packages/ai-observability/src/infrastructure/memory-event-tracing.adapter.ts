import type { EventPublisher, MemoryDomainEvent } from "@rmsm/ai-memory";
import { AuditService } from "../application/services/audit.service";

/**
 * The concrete seam that lets AI-204 observe AI-203 without AI-203
 * knowing AI-204 exists: this class implements `@rmsm/ai-memory`'s own
 * `EventPublisher` port. Hand an instance of this to `MemoryService`/
 * `ConversationService`/`MemoryRetriever`/`MemorySummarizer` (or
 * `subscribe()` it to an `InMemoryEventPublisher`) and every
 * `MemoryDomainEvent` those services raise gets audited here — the
 * dependency arrow points ai-observability -> ai-memory, never back.
 *
 * Recorded as `AuditEntry` rows (keyed by the event's own `aggregateId`)
 * rather than routed through `TracingService`'s `AIRequest`-scoped
 * methods: `MemoryDomainEvent` carries no `requestId` field (AI-203 has
 * no concept of an AI-204 "request"), so there is no `AIRequest` this
 * adapter could reliably attach a `MemoryTrace` to without inventing
 * one. Audit entries have no such precondition — they're the right
 * granularity for "something happened in memory, unscoped to a request."
 */
export class MemoryEventTracingAdapter implements EventPublisher {
  constructor(private readonly auditService: AuditService) {}

  async publish(events: readonly MemoryDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.auditService.record(event.aggregateId, event.kind, JSON.stringify(event));
    }
  }
}
