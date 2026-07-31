import { resolveCoinGeckoId, COINGECKO_SYMBOL_TO_ID } from "../coingecko.constants";

describe("resolveCoinGeckoId", () => {
  it("resolves every MD-002 example ticker to its documented CoinGecko id", () => {
    expect(resolveCoinGeckoId("BTC")).toBe("bitcoin");
    expect(resolveCoinGeckoId("ETH")).toBe("ethereum");
    expect(resolveCoinGeckoId("BNB")).toBe("binancecoin");
    expect(resolveCoinGeckoId("SOL")).toBe("solana");
    expect(resolveCoinGeckoId("XRP")).toBe("ripple");
    expect(resolveCoinGeckoId("DOGE")).toBe("dogecoin");
    expect(resolveCoinGeckoId("ADA")).toBe("cardano");
  });

  it("is case-insensitive for known tickers", () => {
    expect(resolveCoinGeckoId("btc")).toBe("bitcoin");
    expect(resolveCoinGeckoId("Btc")).toBe("bitcoin");
  });

  it("passes through an unrecognized symbol as a lower-cased CoinGecko id, rather than throwing", () => {
    expect(resolveCoinGeckoId("usd-coin")).toBe("usd-coin");
    expect(resolveCoinGeckoId("SHIBA-INU")).toBe("shiba-inu");
  });

  it("the symbol table covers exactly MD-002's documented example list", () => {
    expect(Object.keys(COINGECKO_SYMBOL_TO_ID).sort()).toEqual(["ADA", "BNB", "BTC", "DOGE", "ETH", "SOL", "XRP"]);
  });
});
