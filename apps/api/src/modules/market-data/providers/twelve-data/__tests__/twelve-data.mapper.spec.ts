import { TwelveDataMapper } from "../twelve-data.mapper";
import type { TwelveDataTimeSeriesResponse, TwelveDataQuoteResponse, TwelveDataSymbolSearchResponse } from "../twelve-data.client";

describe("TwelveDataMapper", () => {
  let mapper: TwelveDataMapper;

  beforeEach(() => {
    mapper = new TwelveDataMapper();
  });

  describe("toNormalizedCandles (historical candles)", () => {
    it("maps every value in a time_series response into a NormalizedCandle, preserving OHLCV as strings", () => {
      const response: TwelveDataTimeSeriesResponse = {
        meta: { symbol: "AAPL", interval: "1day" },
        status: "ok",
        values: [
          { datetime: "2026-01-02", open: "185.00", high: "187.50", low: "184.20", close: "186.90", volume: "48213000" },
          { datetime: "2026-01-01", open: "183.10", high: "185.60", low: "182.90", close: "185.00", volume: "39120000" },
        ],
      };

      const candles = mapper.toNormalizedCandles(response, "AAPL", "ONE_DAY");

      expect(candles).toHaveLength(2);
      expect(candles[0]).toEqual({
        providerSymbol: "AAPL",
        interval: "ONE_DAY",
        eventTime: new Date("2026-01-02T00:00:00Z"),
        open: "185.00",
        high: "187.50",
        low: "184.20",
        close: "186.90",
        volume: "48213000",
      });
    });

    it("parses an intraday datetime (with time component) as UTC", () => {
      const candle = mapper.toNormalizedCandle(
        { datetime: "2026-01-02 14:30:00", open: "185.00", high: "185.50", low: "184.80", close: "185.20", volume: "120000" },
        "AAPL",
        "FIFTEEN_MINUTES",
      );
      expect(candle.eventTime).toEqual(new Date("2026-01-02T14:30:00Z"));
    });

    it("returns an empty array when the response has no values (e.g. an unmapped symbol)", () => {
      expect(mapper.toNormalizedCandles({ status: "ok" }, "ZZZZ", "ONE_DAY")).toEqual([]);
    });
  });

  describe("toNormalizedQuote (quotes)", () => {
    it("maps bid/ask/last price and prefers the datetime field for eventTime", () => {
      const response: TwelveDataQuoteResponse = {
        symbol: "AAPL",
        bid: "186.85",
        ask: "186.95",
        close: "186.90",
        datetime: "2026-01-02 16:00:00",
        status: "ok",
      };

      const quote = mapper.toNormalizedQuote(response);

      expect(quote).toEqual({
        providerSymbol: "AAPL",
        bidPrice: "186.85",
        askPrice: "186.95",
        lastPrice: "186.90",
        eventTime: new Date("2026-01-02T16:00:00Z"),
      });
    });

    it("falls back to the numeric unix timestamp field when datetime is absent", () => {
      const quote = mapper.toNormalizedQuote({ symbol: "AAPL", close: "186.90", timestamp: 1767369600 });
      expect(quote.eventTime).toEqual(new Date(1767369600 * 1000));
    });
  });

  describe("toNormalizedSymbolSearchResults (symbol search)", () => {
    it("maps provider symbol, display name, exchange, asset class, and currency", () => {
      const response: TwelveDataSymbolSearchResponse = {
        status: "ok",
        data: [
          {
            symbol: "AAPL",
            instrument_name: "Apple Inc",
            exchange: "NASDAQ",
            mic_code: "XNGS",
            instrument_type: "Common Stock",
            country: "United States",
            currency: "USD",
          },
        ],
      };

      const results = mapper.toNormalizedSymbolSearchResults(response);

      expect(results).toEqual([
        { providerSymbol: "AAPL", name: "Apple Inc", assetClass: "EQUITY", exchangeCode: "XNGS", currency: "USD" },
      ]);
    });

    it("maps every known Twelve Data instrument_type to the correct AssetClass", () => {
      const cases: [string, string][] = [
        ["Common Stock", "EQUITY"],
        ["ETF", "ETF"],
        ["Digital Currency", "CRYPTO"],
        ["Physical Currency", "FOREX"],
        ["Index", "INDEX"],
        ["Commodity", "COMMODITY"],
        ["Bond", "BOND"],
        ["Option", "OPTION"],
        ["Future", "FUTURE"],
      ];

      for (const [instrumentType, expectedAssetClass] of cases) {
        const result = mapper.toNormalizedSymbolSearchResult({ symbol: "X", instrument_name: "X", instrument_type: instrumentType });
        expect(result.assetClass).toBe(expectedAssetClass);
      }
    });

    it("falls back to EQUITY for an unrecognized or missing instrument_type, rather than throwing", () => {
      expect(mapper.toNormalizedSymbolSearchResult({ symbol: "X", instrument_name: "X", instrument_type: "Something New" }).assetClass).toBe(
        "EQUITY",
      );
      expect(mapper.toNormalizedSymbolSearchResult({ symbol: "X", instrument_name: "X" }).assetClass).toBe("EQUITY");
    });

    it("returns an empty array when the response has no data", () => {
      expect(mapper.toNormalizedSymbolSearchResults({ status: "ok" })).toEqual([]);
    });
  });
});
