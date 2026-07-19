import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

export class OpportunityExpiredEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "OpportunityExpired";
  readonly occurredAt: Date;
  readonly aggregateId: string;

  constructor(opportunityId: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = opportunityId;
    this.occurredAt = occurredAt;
  }
}
