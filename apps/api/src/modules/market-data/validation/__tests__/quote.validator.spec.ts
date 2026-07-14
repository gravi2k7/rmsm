import { validateQuote } from "../quote.validator";
import { InvalidTimestampError, InvalidPrecisionError } from "../errors/market-data-validation.error";
import type { NormalizedQuote } from "../../interfaces/normalized-market-data.interface";

describe("validateQuote", () => {
  it("computes mid and spread for a two-sided quote", () => {
    const result = validateQuote({
      providerSymbol: "AAPL",
      bidPrice: "100",
      askPrice: "101",
      eventTime: new Date(),
    } as NormalizedQuote);
    expect(result.mid).toBe("100.5");
    expect(result.spread).toBe("1");
    expect(result.isCrossed).toBe(false);
  });

  it("detects a crossed market (bid > ask)", () => {
    const result = validateQuote({
      providerSymbol: "AAPL",
      bidPrice: "101",
      askPrice: "100",
      eventTime: new Date(),
    } as NormalizedQuote);
    expect(result.isCrossed).toBe(true);
  });

  it("accepts a legitimately one-sided quote (no ask) without computing mid/spread", () => {
    const result = validateQuote({
      providerSymbol: "AAPL",
      bidPrice: "100",
      eventTime: new Date(),
    } as NormalizedQuote);
    expect(result.mid).toBeNull();
    expect(result.spread).toBeNull();
    expect(result.isCrossed).toBe(false);
  });

  it("rejects a non-positive bid price", () => {
    expect(() =>
      validateQuote({ providerSymbol: "AAPL", bidPrice: "0", eventTime: new Date() } as NormalizedQuote),
    ).toThrow(InvalidPrecisionError);
  });

  it("rejects an invalid eventTime", () => {
    expect(() =>
      validateQuote({ providerSymbol: "AAPL", eventTime: new Date("invalid") } as NormalizedQuote),
    ).toThrow(InvalidTimestampError);
  });
});
