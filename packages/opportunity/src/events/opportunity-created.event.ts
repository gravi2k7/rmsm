import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

export class OpportunityCreatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "OpportunityCreated";
  readonly occurredAt: Date;
  readonly aggregateId: string;

  constructor(opportunityId: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = opportunityId;
    this.occurredAt = occurredAt;
  }
}
