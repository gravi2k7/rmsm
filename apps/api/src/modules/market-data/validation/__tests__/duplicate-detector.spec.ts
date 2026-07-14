import { detectCandleDuplicates, detectTickDuplicates, detectQuoteDuplicates } from "../duplicate-detector";
import type { NormalizedCandle, NormalizedTick, NormalizedQuote } from "../../interfaces/normalized-market-data.interface";

describe("detectCandleDuplicates", () => {
  it("finds no duplicates in a clean batch", () => {
    const candles: NormalizedCandle[] = [
      { providerSymbol: "AAPL", interval: "ONE_DAY", eventTime: new Date("2026-01-01"), open: "1", high: "1", low: "1", close: "1", volume: "1" },
      { providerSymbol: "AAPL", interval: "ONE_DAY", eventTime: new Date("2026-01-02"), open: "1", high: "1", low: "1", close: "1", volume: "1" },
    ];
    expect(detectCandleDuplicates(candles)).toHaveLength(0);
  });

  it("finds a duplicate by (symbol, interval, eventTime), ignoring price differences", () => {
    const candles: NormalizedCandle[] = [
      { providerSymbol: "AAPL", interval: "ONE_DAY", eventTime: new Date("2026-01-01"), open: "1", high: "1", low: "1", close: "1", volume: "1" },
      { providerSymbol: "AAPL", interval: "ONE_DAY", eventTime: new Date("2026-01-01"), open: "999", high: "999", low: "999", close: "999", volume: "1" },
    ];
    const findings = detectCandleDuplicates(candles);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.index).toBe(1);
    expect(findings[0]?.duplicateOfIndex).toBe(0);
  });

  it("does not flag the same symbol at a different interval as a duplicate", () => {
    const candles: NormalizedCandle[] = [
      { providerSymbol: "AAPL", interval: "ONE_DAY", eventTime: new Date("2026-01-01"), open: "1", high: "1", low: "1", close: "1", volume: "1" },
      { providerSymbol: "AAPL", interval: "ONE_HOUR", eventTime: new Date("2026-01-01"), open: "1", high: "1", low: "1", close: "1", volume: "1" },
    ];
    expect(detectCandleDuplicates(candles)).toHaveLength(0);
  });
});

describe("detectTickDuplicates", () => {
  it("flags an identical (symbol, time, price, size) tick repeated in the batch", () => {
    const ticks: NormalizedTick[] = [
      { providerSymbol: "AAPL", price: "100", size: "10", eventTime: new Date("2026-01-01T00:00:00Z") },
      { providerSymbol: "AAPL", price: "100", size: "10", eventTime: new Date("2026-01-01T00:00:00Z") },
    ];
    expect(detectTickDuplicates(ticks)).toHaveLength(1);
  });

  it("does not flag two genuinely different trades at the same instant", () => {
    const ticks: NormalizedTick[] = [
      { providerSymbol: "AAPL", price: "100", size: "10", eventTime: new Date("2026-01-01T00:00:00Z") },
      { providerSymbol: "AAPL", price: "100.01", size: "10", eventTime: new Date("2026-01-01T00:00:00Z") },
    ];
    expect(detectTickDuplicates(ticks)).toHaveLength(0);
  });
});

describe("detectQuoteDuplicates", () => {
  it("flags a repeated quote for the same symbol at the same instant", () => {
    const quotes: NormalizedQuote[] = [
      { providerSymbol: "AAPL", eventTime: new Date("2026-01-01T00:00:00Z") },
      { providerSymbol: "AAPL", eventTime: new Date("2026-01-01T00:00:00Z") },
    ];
    expect(detectQuoteDuplicates(quotes)).toHaveLength(1);
  });
});
