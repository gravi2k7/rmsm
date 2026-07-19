import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

export class ExecutionCompletedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "ExecutionCompleted";
  readonly occurredAt: Date;
  readonly aggregateId: string;

  constructor(executionId: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = executionId;
    this.occurredAt = occurredAt;
  }
}
