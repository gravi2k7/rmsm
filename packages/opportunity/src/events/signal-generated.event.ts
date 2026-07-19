import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

export class SignalGeneratedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "SignalGenerated";
  readonly occurredAt: Date;
  readonly aggregateId: string;

  constructor(signalId: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = signalId;
    this.occurredAt = occurredAt;
  }
}
