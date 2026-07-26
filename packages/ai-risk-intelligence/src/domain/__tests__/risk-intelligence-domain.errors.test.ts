import { describe, expect, it } from "vitest";
import { EmptyCorrelationSetError, EmptyStressScenarioSetError } from "../errors/risk-intelligence-domain.errors";

describe("risk-intelligence domain errors", () => {
  it("EmptyCorrelationSetError carries the EMPTY_CORRELATION_SET code", () => {
    expect(new EmptyCorrelationSetError().code).toBe("EMPTY_CORRELATION_SET");
  });

  it("EmptyStressScenarioSetError carries the EMPTY_STRESS_SCENARIO_SET code", () => {
    expect(new EmptyStressScenarioSetError().code).toBe("EMPTY_STRESS_SCENARIO_SET");
  });
});
