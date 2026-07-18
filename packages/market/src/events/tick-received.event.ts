import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

/** Raised when a new `Tick` arrives for a symbol. */
export class TickReceivedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "TickReceived";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly symbolCode: string;

  constructor(tickId: string, symbolCode: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = tickId;
    this.symbolCode = symbolCode;
    this.occurredAt = occurredAt;
  }
}
