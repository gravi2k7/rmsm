import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

/** Raised when an `Exchange` transitions from open to closed. */
export class MarketClosedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "MarketClosed";
  readonly occurredAt: Date;
  readonly aggregateId: string;

  constructor(exchangeId: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = exchangeId;
    this.occurredAt = occurredAt;
  }
}
