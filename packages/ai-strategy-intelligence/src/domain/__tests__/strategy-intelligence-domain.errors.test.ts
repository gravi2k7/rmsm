import { describe, expect, it } from "vitest";
import { InvalidComparisonSetError, StrategyHasNoVersionError } from "../errors/strategy-intelligence-domain.errors";

describe("strategy-intelligence domain errors", () => {
  it("InvalidComparisonSetError carries the INVALID_COMPARISON_SET code", () => {
    expect(new InvalidComparisonSetError(1).code).toBe("INVALID_COMPARISON_SET");
  });

  it("StrategyHasNoVersionError carries the STRATEGY_HAS_NO_VERSION code", () => {
    expect(new StrategyHasNoVersionError("strategy-1").code).toBe("STRATEGY_HAS_NO_VERSION");
  });
});
