import { DomainError } from "@rmsm/core";

export class NegativeDurationError extends DomainError {
  constructor() {
    super("Duration must not be negative.", "NEGATIVE_DURATION");
  }
}

export class NegativeCostAmountError extends DomainError {
  constructor() {
    super("Cost amount must not be negative.", "NEGATIVE_COST_AMOUNT");
  }
}

export class CurrencyMismatchError extends DomainError {
  constructor(agentId: string, expected: string, received: string) {
    super(`Cost currency mismatch for agent "${agentId}": expected ${expected}, received ${received}.`, "CURRENCY_MISMATCH");
  }
}
