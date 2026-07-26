import { DomainError } from "@rmsm/core";

export class InsufficientCandlesError extends DomainError {
  constructor(required: number, received: number) {
    super(`At least ${required} candles are required for this analysis; received ${received}.`, "INSUFFICIENT_CANDLES");
  }
}

export class EmptyTimeframeSetError extends DomainError {
  constructor() {
    super("At least one timeframe's candles must be provided.", "EMPTY_TIMEFRAME_SET");
  }
}
