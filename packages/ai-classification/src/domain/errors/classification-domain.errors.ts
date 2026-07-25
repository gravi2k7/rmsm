import { DomainError } from "@rmsm/core";

export class EmptyClassificationInputError extends DomainError {
  constructor() {
    super("Cannot classify empty text.", "EMPTY_CLASSIFICATION_INPUT");
  }
}

export class InvalidRuleDefinitionError extends DomainError {
  constructor(reason: string) {
    super(`Invalid classification rule: ${reason}`, "INVALID_RULE_DEFINITION");
  }
}

export class InvalidConfidenceThresholdError extends DomainError {
  constructor(threshold: number) {
    super(`Confidence threshold must be between 0 and 1, got ${threshold}.`, "INVALID_CONFIDENCE_THRESHOLD");
  }
}
