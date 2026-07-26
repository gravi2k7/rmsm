import { DomainError } from "@rmsm/core";

export class EmptyCorrelationSetError extends DomainError {
  constructor() {
    super("At least one correlation reading must be provided.", "EMPTY_CORRELATION_SET");
  }
}

export class EmptyStressScenarioSetError extends DomainError {
  constructor() {
    super("At least one shock percentage must be provided to run a stress scenario.", "EMPTY_STRESS_SCENARIO_SET");
  }
}
