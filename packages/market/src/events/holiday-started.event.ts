import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";

/** Raised when a `MarketHoliday` begins — the exchange it applies to
 * will not trade for its duration. */
export class HolidayStartedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "HolidayStarted";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly exchangeId: string;
  readonly holidayName: string;

  constructor(holidayId: string, exchangeId: string, holidayName: string, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = holidayId;
    this.exchangeId = exchangeId;
    this.holidayName = holidayName;
    this.occurredAt = occurredAt;
  }
}
