import { Injectable } from "@nestjs/common";
import type { IntegrationEventHandler } from "./integration-event-handler.interface";
import type { IntegrationEvent } from "../events/integration-event.interface";
import { AuditService } from "../../../auth/services/audit.service";

/**
 * Real audit logging — reuses the platform's own EXISTING
 * `AuditService`/`AuditLog` table (`auth/services/audit.service.ts`,
 * established platform-wide since Module 002) rather than building a
 * parallel audit system. This milestone's own "no duplicated logic"
 * discipline, applied at the platform level, not just within one
 * module: `AuditLog` already has exactly the shape a real audit trail
 * needs (`userId`, `entityType`, `entityId`, `metadata`, `createdAt`),
 * and `AuditService.log()` is already the platform's own single write
 * path for it. This handler's own job is narrow — translate one
 * `IntegrationEvent` into one real `AuditService.log()` call, carrying
 * this milestone's own required "Who/What/When/Organization/Before/
 * After/Reason/CorrelationId" fields inside `metadata` (the ONLY
 * extensibility point `AuditService.log()`'s own existing signature
 * offers — not modified here, reused as-is).
 *
 * "Before/After" is a real, honest limitation: `payload` carries
 * whatever change-describing fields each specific domain event
 * already has (`changedFields` on an update, `versionNumber`/
 * `supersedesVersionId` on a publish, etc.) — genuine, useful audit
 * context — but not a full before/after object SNAPSHOT. Capturing
 * that would need every Milestone 3 command handler to build and
 * thread snapshot state through its own domain event construction, a
 * more invasive change than this milestone's own scope justifies for
 * the events built so far. Named here explicitly, not silently
 * omitted.
 */
@Injectable()
export class AuditEventHandler implements IntegrationEventHandler {
  constructor(private readonly auditService: AuditService) {}

  async handle(event: IntegrationEvent): Promise<void> {
    await this.auditService.log(`strategy-engine.${event.eventType}`, {
      userId: event.userId,
      entityType: event.aggregateType,
      entityId: event.aggregateId,
      metadata: {
        organizationId: event.organizationId,
        correlationId: event.correlationId,
        causationId: event.causationId,
        eventId: event.eventId,
        occurredAt: event.occurredAt.toISOString(),
        payload: event.payload,
      },
    });
  }
}
