import { describe, expect, it } from "vitest";
import { EmptyTradeSetError, InvalidComparisonSetError } from "../errors/backtest-intelligence-domain.errors";

describe("backtest-intelligence domain errors", () => {
  it("EmptyTradeSetError carries the EMPTY_TRADE_SET code", () => {
    expect(new EmptyTradeSetError().code).toBe("EMPTY_TRADE_SET");
  });

  it("InvalidComparisonSetError carries the INVALID_COMPARISON_SET code", () => {
    expect(new InvalidComparisonSetError(1).code).toBe("INVALID_COMPARISON_SET");
  });
});
