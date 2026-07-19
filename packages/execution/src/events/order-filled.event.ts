import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

export class OrderFilledEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "OrderFilled";
  readonly occurredAt: Date;
  readonly aggregateId: string;

  constructor(orderId: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = orderId;
    this.occurredAt = occurredAt;
  }
}
