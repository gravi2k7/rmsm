import { DomainError } from "@rmsm/core";

export class EmptyTradeSetError extends DomainError {
  constructor() {
    super("At least one trade is required for this analysis.", "EMPTY_TRADE_SET");
  }
}

export class InvalidComparisonSetError extends DomainError {
  constructor(received: number) {
    super(`At least 2 backtest runs are required to run a comparison; received ${received}.`, "INVALID_COMPARISON_SET");
  }
}
