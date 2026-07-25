import { describe, expect, it } from "vitest";
import { NegativeDurationError, NegativeCostAmountError, CurrencyMismatchError } from "../errors/agent-analytics-domain.errors";

describe("agent-analytics domain errors", () => {
  it("carry stable error codes", () => {
    expect(new NegativeDurationError().code).toBe("NEGATIVE_DURATION");
    expect(new NegativeCostAmountError().code).toBe("NEGATIVE_COST_AMOUNT");
    expect(new CurrencyMismatchError("a1", "USD", "EUR").code).toBe("CURRENCY_MISMATCH");
  });
});
