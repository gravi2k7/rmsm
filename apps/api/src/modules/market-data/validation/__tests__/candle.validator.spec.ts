import { validateCandle } from "../candle.validator";
import { InvalidOhlcError, InvalidVolumeError, InvalidTimestampError } from "../errors/market-data-validation.error";
import type { NormalizedCandle } from "../../interfaces/normalized-market-data.interface";

function baseCandle(overrides: Partial<NormalizedCandle> = {}): NormalizedCandle {
  return {
    providerSymbol: "AAPL",
    interval: "ONE_DAY",
    eventTime: new Date("2026-01-01T00:00:00Z"),
    open: "100",
    high: "105",
    low: "95",
    close: "102",
    volume: "1000",
    ...overrides,
  };
}

describe("validateCandle", () => {
  it("accepts a genuinely valid candle", () => {
    expect(() => validateCandle(baseCandle())).not.toThrow();
  });

  it("rejects High < Open", () => {
    expect(() => validateCandle(baseCandle({ high: "99", open: "100" }))).toThrow(InvalidOhlcError);
  });

  it("rejects High < Close", () => {
    expect(() => validateCandle(baseCandle({ high: "99", close: "100" }))).toThrow(InvalidOhlcError);
  });

  it("rejects Low > Open", () => {
    expect(() => validateCandle(baseCandle({ low: "101", open: "100" }))).toThrow(InvalidOhlcError);
  });

  it("rejects Low > Close", () => {
    expect(() => validateCandle(baseCandle({ low: "101", close: "100" }))).toThrow(InvalidOhlcError);
  });

  it("rejects High < Low", () => {
    expect(() => validateCandle(baseCandle({ high: "90", low: "95" }))).toThrow(InvalidOhlcError);
  });

  it("accepts a candle where High == Open == Close == Low (a flat/zero-volatility bar)", () => {
    expect(() => validateCandle(baseCandle({ open: "100", high: "100", low: "100", close: "100" }))).not.toThrow();
  });

  it("rejects negative volume", () => {
    expect(() => validateCandle(baseCandle({ volume: "-1" }))).toThrow(InvalidVolumeError);
  });

  it("accepts zero volume (a real, valid state — no trades in this bar)", () => {
    expect(() => validateCandle(baseCandle({ volume: "0" }))).not.toThrow();
  });

  it("rejects an unrecognized interval", () => {
    expect(() => validateCandle(baseCandle({ interval: "TWO_DAYS" as never }))).toThrow(InvalidTimestampError);
  });

  it("rejects an invalid eventTime", () => {
    expect(() => validateCandle(baseCandle({ eventTime: new Date("invalid") }))).toThrow(InvalidTimestampError);
  });
});
