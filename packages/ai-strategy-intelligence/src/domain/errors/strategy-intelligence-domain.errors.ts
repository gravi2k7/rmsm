import { DomainError } from "@rmsm/core";

export class InvalidComparisonSetError extends DomainError {
  constructor(received: number) {
    super(`At least 2 strategies are required to run a comparison; received ${received}.`, "INVALID_COMPARISON_SET");
  }
}

export class StrategyHasNoVersionError extends DomainError {
  constructor(strategyId: string) {
    super(`Strategy "${strategyId}" has no current version to evaluate.`, "STRATEGY_HAS_NO_VERSION");
  }
}
