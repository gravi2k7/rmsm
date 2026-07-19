import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

export class PositionOpenedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "PositionOpened";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly positionId: string;

  constructor(portfolioId: string, positionId: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = portfolioId;
    this.positionId = positionId;
    this.occurredAt = occurredAt;
  }
}
