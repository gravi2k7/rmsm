import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

export class ExecutionFailedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "ExecutionFailed";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly reason: string;

  constructor(executionId: string, reason: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = executionId;
    this.reason = reason;
    this.occurredAt = occurredAt;
  }
}
