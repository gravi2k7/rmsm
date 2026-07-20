import { describe, expect, it } from "vitest";
import { toTradingViewSymbol } from "../tradingview-chart";

describe("toTradingViewSymbol", () => {
  it("maps FOREX instruments to the FX: prefix, stripping any slash", () => {
    expect(toTradingViewSymbol({ symbol: "EUR/USD", assetClass: "FOREX" })).toBe("FX:EURUSD");
  });

  it("maps CRYPTO instruments to the BINANCE: prefix, stripping slashes and dashes", () => {
    expect(toTradingViewSymbol({ symbol: "BTC-USD", assetClass: "CRYPTO" })).toBe("BINANCE:BTCUSD");
  });

  it("passes INDEX symbols through unchanged", () => {
    expect(toTradingViewSymbol({ symbol: "SPX", assetClass: "INDEX" })).toBe("SPX");
  });

  it("passes other asset classes through unchanged", () => {
    expect(toTradingViewSymbol({ symbol: "AAPL", assetClass: "EQUITY" })).toBe("AAPL");
  });
});
