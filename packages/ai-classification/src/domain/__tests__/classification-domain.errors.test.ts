import { describe, it, expect } from "vitest";
import {
  EmptyClassificationInputError,
  InvalidRuleDefinitionError,
  InvalidConfidenceThresholdError,
} from "../errors/classification-domain.errors";

describe("classification domain errors", () => {
  it("EmptyClassificationInputError carries a stable code", () => {
    expect(new EmptyClassificationInputError().code).toBe("EMPTY_CLASSIFICATION_INPUT");
  });
  it("InvalidRuleDefinitionError carries a stable code", () => {
    expect(new InvalidRuleDefinitionError("no keywords").code).toBe("INVALID_RULE_DEFINITION");
  });
  it("InvalidConfidenceThresholdError carries a stable code", () => {
    expect(new InvalidConfidenceThresholdError(1.5).code).toBe("INVALID_CONFIDENCE_THRESHOLD");
  });
});
