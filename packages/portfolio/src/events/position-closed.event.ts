import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

export class PositionClosedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "PositionClosed";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly positionId: string;
  readonly realizedPnl: number;

  constructor(portfolioId: string, positionId: string, realizedPnl: number, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = portfolioId;
    this.positionId = positionId;
    this.realizedPnl = realizedPnl;
    this.occurredAt = occurredAt;
  }
}
