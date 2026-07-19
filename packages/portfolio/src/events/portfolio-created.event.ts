import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

export class PortfolioCreatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "PortfolioCreated";
  readonly occurredAt: Date;
  readonly aggregateId: string;

  constructor(portfolioId: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = portfolioId;
    this.occurredAt = occurredAt;
  }
}
