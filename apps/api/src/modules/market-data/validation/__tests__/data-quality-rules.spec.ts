import {
  RmsmInvalidValueDetector,
  RmsmOutOfOrderDetector,
  checkMissingFields,
  checkFutureTimestamp,
  checkNegativeTimestamp,
  checkInvalidTimeframe,
  checkInvalidSymbol,
  checkProviderInconsistency,
} from "../data-quality-rules";
import type { NormalizedCandle } from "../../interfaces/normalized-market-data.interface";

function candle(overrides: Partial<NormalizedCandle> = {}): NormalizedCandle {
  return {
    providerSymbol: "AAPL",
    interval: "ONE_DAY",
    eventTime: new Date("2026-01-01"),
    open: "100",
    high: "105",
    low: "95",
    close: "102",
    volume: "1000",
    ...overrides,
  };
}

describe("RmsmInvalidValueDetector", () => {
  const detector = new RmsmInvalidValueDetector();

  it("flags negative_price", () => {
    const findings = detector.detectInvalidValues([candle({ open: "-1" })]);
    expect(findings.map((f) => f.reason)).toContain("negative_price");
  });

  it("flags zero_price", () => {
    const findings = detector.detectInvalidValues([candle({ open: "0" })]);
    expect(findings.map((f) => f.reason)).toContain("zero_price");
  });

  it("flags negative_volume", () => {
    const findings = detector.detectInvalidValues([candle({ volume: "-5" })]);
    expect(findings.map((f) => f.reason)).toContain("negative_volume");
  });

  it("flags high_below_low", () => {
    const findings = detector.detectInvalidValues([candle({ high: "10", low: "20" })]);
    expect(findings.map((f) => f.reason)).toContain("high_below_low");
  });

  it("flags open_close_outside_range", () => {
    const findings = detector.detectInvalidValues([candle({ open: "200" })]);
    expect(findings.map((f) => f.reason)).toContain("open_close_outside_range");
  });

  it("finds nothing for a clean candle", () => {
    expect(detector.detectInvalidValues([candle()])).toHaveLength(0);
  });
});

describe("RmsmOutOfOrderDetector", () => {
  const detector = new RmsmOutOfOrderDetector();

  it("flags a candle that arrives before the previous one chronologically", () => {
    const candles = [candle({ eventTime: new Date("2026-01-02") }), candle({ eventTime: new Date("2026-01-01") })];
    const findings = detector.detectOutOfOrder(candles);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.candle.eventTime).toEqual(new Date("2026-01-01"));
  });

  it("finds nothing for a chronologically ordered batch", () => {
    const candles = [candle({ eventTime: new Date("2026-01-01") }), candle({ eventTime: new Date("2026-01-02") })];
    expect(detector.detectOutOfOrder(candles)).toHaveLength(0);
  });
});

describe("standalone quality-rule checks", () => {
  it("checkMissingFields flags an absent required field", () => {
    const result = checkMissingFields({ providerSymbol: "AAPL" });
    expect(result?.rule).toBe("missing_fields");
  });

  it("checkFutureTimestamp flags a timestamp after 'now'", () => {
    const result = checkFutureTimestamp(new Date(Date.now() + 100000));
    expect(result?.rule).toBe("future_timestamp");
  });

  it("checkNegativeTimestamp flags a pre-epoch timestamp", () => {
    const result = checkNegativeTimestamp(new Date(-1000));
    expect(result?.rule).toBe("negative_timestamp");
  });

  it("checkInvalidTimeframe flags an unrecognized interval", () => {
    expect(checkInvalidTimeframe("NOT_REAL")?.rule).toBe("invalid_timeframe");
    expect(checkInvalidTimeframe("ONE_DAY")).toBeNull();
  });

  it("checkInvalidSymbol flags an empty symbol", () => {
    expect(checkInvalidSymbol("   ")?.rule).toBe("invalid_symbol");
    expect(checkInvalidSymbol("AAPL")).toBeNull();
  });

  it("checkProviderInconsistency flags the same symbol reported with two different currencies in one batch", () => {
    const findings = checkProviderInconsistency([
      { providerSymbol: "BTCUSDT", currency: "USD" },
      { providerSymbol: "BTCUSDT", currency: "USDT" },
    ]);
    expect(findings).toHaveLength(1);
  });

  it("checkProviderInconsistency finds nothing when currency is consistent", () => {
    const findings = checkProviderInconsistency([
      { providerSymbol: "AAPL", currency: "USD" },
      { providerSymbol: "AAPL", currency: "USD" },
    ]);
    expect(findings).toHaveLength(0);
  });
});
