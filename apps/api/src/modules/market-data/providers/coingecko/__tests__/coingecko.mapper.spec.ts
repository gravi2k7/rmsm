import { CoinGeckoMapper } from "../coingecko.mapper";
import type { CoinGeckoMarketsEntry, CoinGeckoOhlcEntry, CoinGeckoSearchResponse } from "../coingecko.types";

function buildEntry(overrides: Partial<CoinGeckoMarketsEntry> = {}): CoinGeckoMarketsEntry {
  return {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    current_price: 65000.12,
    market_cap: 1280000000000,
    total_volume: 32000000000,
    high_24h: 65500,
    low_24h: 64000,
    price_change_percentage_24h: 2.35,
    circulating_supply: 19700000,
    total_supply: 21000000,
    last_updated: "2026-01-02T16:00:00.000Z",
    ...overrides,
  };
}

describe("CoinGeckoMapper", () => {
  let mapper: CoinGeckoMapper;

  beforeEach(() => {
    mapper = new CoinGeckoMapper();
  });

  describe("toNormalizedQuote (current price)", () => {
    it("maps current_price to lastPrice, leaving bid/ask undefined (CoinGecko has no order-book concept)", () => {
      const quote = mapper.toNormalizedQuote(buildEntry());
      expect(quote).toEqual({
        providerSymbol: "bitcoin",
        lastPrice: "65000.12",
        eventTime: new Date("2026-01-02T16:00:00.000Z"),
        bidPrice: undefined,
        askPrice: undefined,
      });
    });

    it("leaves lastPrice undefined (not '0' or 'null') when current_price is null", () => {
      const quote = mapper.toNormalizedQuote(buildEntry({ current_price: null }));
      expect(quote.lastPrice).toBeUndefined();
    });

    it("falls back to now() when last_updated is null", () => {
      const before = Date.now();
      const quote = mapper.toNormalizedQuote(buildEntry({ last_updated: null }));
      expect(quote.eventTime.getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  describe("toMarketSnapshot (market cap / 24h volume / change / high / low / supply)", () => {
    it("maps every MD-002 'Supported Data' field CoinGecko provides that NormalizedQuote has no field for", () => {
      const snapshot = mapper.toMarketSnapshot(buildEntry());
      expect(snapshot).toEqual({
        providerSymbol: "bitcoin",
        lastPriceUsd: 65000.12,
        marketCapUsd: 1280000000000,
        volume24hUsd: 32000000000,
        change24hPercent: 2.35,
        high24hUsd: 65500,
        low24hUsd: 64000,
        circulatingSupply: 19700000,
        totalSupply: 21000000,
        eventTime: new Date("2026-01-02T16:00:00.000Z"),
      });
    });

    it("passes through null fields as null rather than coercing to 0", () => {
      const snapshot = mapper.toMarketSnapshot(buildEntry({ total_supply: null, high_24h: null }));
      expect(snapshot.totalSupply).toBeNull();
      expect(snapshot.high24hUsd).toBeNull();
    });
  });

  describe("toNormalizedCandles (historical OHLC)", () => {
    it("maps [timestamp, open, high, low, close] tuples into NormalizedCandle, with volume honestly '0'", () => {
      const entries: CoinGeckoOhlcEntry[] = [[1767369600000, 64000, 65500, 63800, 65000]];
      const candles = mapper.toNormalizedCandles(entries, "bitcoin", "FOUR_HOURS");

      expect(candles).toEqual([
        {
          providerSymbol: "bitcoin",
          interval: "FOUR_HOURS",
          eventTime: new Date(1767369600000),
          open: "64000",
          high: "65500",
          low: "63800",
          close: "65000",
          volume: "0",
        },
      ]);
    });

    it("returns an empty array for an empty OHLC response", () => {
      expect(mapper.toNormalizedCandles([], "bitcoin", "THIRTY_MINUTES")).toEqual([]);
    });
  });

  describe("toNormalizedSymbolSearchResults", () => {
    it("maps provider symbol, display name, and always CRYPTO as the asset class", () => {
      const response: CoinGeckoSearchResponse = {
        coins: [{ id: "bitcoin", name: "Bitcoin", symbol: "btc", market_cap_rank: 1 }],
      };
      const results = mapper.toNormalizedSymbolSearchResults(response);
      expect(results).toEqual([{ providerSymbol: "bitcoin", name: "Bitcoin", assetClass: "CRYPTO" }]);
    });

    it("returns an empty array when the response has no coins", () => {
      expect(mapper.toNormalizedSymbolSearchResults({})).toEqual([]);
    });
  });
});
