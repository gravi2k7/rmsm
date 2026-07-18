import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

/** Raised when an `Exchange` transitions from closed to open. */
export class MarketOpenedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "MarketOpened";
  readonly occurredAt: Date;
  readonly aggregateId: string;

  constructor(exchangeId: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = exchangeId;
    this.occurredAt = occurredAt;
  }
}
