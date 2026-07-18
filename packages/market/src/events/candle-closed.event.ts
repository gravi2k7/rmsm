import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@rmsm/core";
import type { Timeframe } from "../enums/timeframe.enum";

/** Raised when a `Candle` completes (its `Timeframe` window has fully
 * elapsed and no further ticks will update it). */
export class CandleClosedEvent implements DomainEvent {
  readonly eventId: string;
  readonly kind = "CandleClosed";
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
