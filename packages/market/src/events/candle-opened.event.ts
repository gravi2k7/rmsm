import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";
import type { Timeframe } from "../enums/timeframe.enum";

/** Raised when a new, not-yet-complete `Candle` begins forming. */
export class CandleOpenedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "CandleOpened";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly symbolCode: string;
  readonly timeframe: Timeframe;

  constructor(candleId: string, symbolCode: string, timeframe: Timeframe, occurredAt: Date = new Date()) {
    this.eventId = randomUUID();
    this.aggregateId = candleId;
    this.symbolCode = symbolCode;
    this.timeframe = timeframe;
    this.occurredAt = occurredAt;
  }
}
