import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

export class DecisionApprovedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "DecisionApproved";
  readonly occurredAt: Date;
  readonly aggregateId: string;

  constructor(decisionId: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = decisionId;
    this.occurredAt = occurredAt;
  }
}
