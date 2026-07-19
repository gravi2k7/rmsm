import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

export class StrategyCreatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "StrategyCreated";
  readonly occurredAt: Date;
  readonly aggregateId: string;

  constructor(strategyId: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = strategyId;
    this.occurredAt = occurredAt;
  }
}
