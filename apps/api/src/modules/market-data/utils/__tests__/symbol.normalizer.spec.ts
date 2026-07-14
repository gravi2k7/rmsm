import { normalizeSymbol } from "../normalizers/symbol.normalizer";
import { InvalidSymbolError } from "../../validation/errors/market-data-validation.error";

describe("normalizeSymbol", () => {
  it("parses EXCHANGE:SYMBOL notation", () => {
    const result = normalizeSymbol("NASDAQ:AAPL");
    expect(result).toMatchObject({ exchangeHint: "NASDAQ", symbol: "AAPL", format: "exchange_prefixed" });
  });

  it("parses a plain symbol with no exchange hint", () => {
    const result = normalizeSymbol("AAPL");
    expect(result).toMatchObject({ exchangeHint: null, symbol: "AAPL", format: "plain" });
  });

  it("parses BINANCE:BTCUSDT, keeping the concatenated pair as-is (no guessed split)", () => {
    const result = normalizeSymbol("BINANCE:BTCUSDT");
    expect(result).toMatchObject({ exchangeHint: "BINANCE", symbol: "BTCUSDT", format: "exchange_prefixed" });
    expect(result.baseCurrency).toBeUndefined();
  });

  it("parses BASE/QUOTE slash notation into an explicit base/quote split", () => {
    const result = normalizeSymbol("BTC/USD");
    expect(result).toMatchObject({ symbol: "BTC-USD", baseCurrency: "BTC", quoteCurrency: "USD", format: "slash_pair" });
  });

  it("does NOT split a concatenated pair like BTCUSDT into base/quote — documented limitation", () => {
    const result = normalizeSymbol("BTCUSDT");
    expect(result.format).toBe("plain");
    expect(result.symbol).toBe("BTCUSDT");
    expect(result.baseCurrency).toBeUndefined();
  });

  it("uppercases and strips whitespace", () => {
    expect(normalizeSymbol("  aapl  ").symbol).toBe("AAPL");
  });

  it("rejects an empty string", () => {
    expect(() => normalizeSymbol("   ")).toThrow(InvalidSymbolError);
  });

  it("rejects EXCHANGE: with no symbol after it", () => {
    expect(() => normalizeSymbol("NASDAQ:")).toThrow(InvalidSymbolError);
  });

  it("rejects BASE/ with no quote currency", () => {
    expect(() => normalizeSymbol("BTC/")).toThrow(InvalidSymbolError);
  });
});
