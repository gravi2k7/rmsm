import { describe, expect, it } from "vitest";
import { InsufficientCandlesError, EmptyTimeframeSetError } from "../errors/market-intelligence-domain.errors";

describe("market-intelligence domain errors", () => {
  it("carry stable error codes", () => {
    expect(new InsufficientCandlesError(4, 2).code).toBe("INSUFFICIENT_CANDLES");
    expect(new EmptyTimeframeSetError().code).toBe("EMPTY_TIMEFRAME_SET");
  });
});
