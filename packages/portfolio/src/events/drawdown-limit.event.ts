import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

/** Raised when a portfolio's own drawdown crosses a configured limit —
 * named `DrawdownLimitEvent` (not `...Breached` or `...Exceeded`) to
 * match this domain's own required event list exactly. */
export class DrawdownLimitEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "DrawdownLimit";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly drawdownPercentage: number;
  readonly limitPercentage: number;

  constructor(portfolioId: string, drawdownPercentage: number, limitPercentage: number, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = portfolioId;
    this.drawdownPercentage = drawdownPercentage;
    this.limitPercentage = limitPercentage;
    this.occurredAt = occurredAt;
  }
}
