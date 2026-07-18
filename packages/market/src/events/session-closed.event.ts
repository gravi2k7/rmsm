import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";
import type { SessionType } from "../types/session-type";

/** Raised when a `MarketSession` (Sydney/Tokyo/London/New York) closes. */
export class SessionClosedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "SessionClosed";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly sessionType: SessionType;

  constructor(sessionId: string, sessionType: SessionType, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = sessionId;
    this.sessionType = sessionType;
    this.occurredAt = occurredAt;
  }
}
