import { AlphaVantageMapper } from "../alphavantage.mapper";
import type { AlphaVantageGlobalQuote, AlphaVantageDailyBar, AlphaVantageExchangeRate, AlphaVantageSearchMatch, AlphaVantageOverviewResponse } from "../alphavantage.types";

function buildQuote(overrides: Partial<AlphaVantageGlobalQuote> = {}): AlphaVantageGlobalQuote {
  return {
    "01. symbol": "IBM",
    "02. open": "188.00",
    "03. high": "190.00",
    "04. low": "187.50",
    "05. price": "189.42",
    "06. volume": "3500000",
    "07. latest trading day": "2026-01-02",
    "08. previous close": "188.10",
    "09. change": "1.32",
    "10. change percent": "0.7016%",
    ...overrides,
  };
}

function buildRate(overrides: Partial<AlphaVantageExchangeRate> = {}): AlphaVantageExchangeRate {
  return {
    "1. From_Currency Code": "EUR",
    "2. From_Currency Name": "Euro",
    "3. To_Currency Code": "USD",
    "4. To_Currency Name": "United States Dollar",
    "5. Exchange Rate": "1.0850",
    "6. Last Refreshed": "2026-01-02 16:00:01",
    "7. Time Zone": "UTC",
    ...overrides,
  };
}

const bar: AlphaVantageDailyBar = { "1. open": "188.00", "2. high": "190.00", "3. low": "187.50", "4. close": "189.42", "5. volume": "3500000" };

describe("AlphaVantageMapper", () => {
  let mapper: AlphaVantageMapper;

  beforeEach(() => {
    mapper = new AlphaVantageMapper();
  });

  describe("toNormalizedQuote", () => {
    it("maps GLOBAL_QUOTE fields to NormalizedQuote, leaving bid/ask undefined (no order-book concept)", () => {
      const quote = mapper.toNormalizedQuote(buildQuote());
      expect(quote.providerSymbol).toBe("IBM");
      expect(quote.lastPrice).toBe("189.42");
      expect(quote.eventTime).toEqual(new Date("2026-01-02T00:00:00Z"));
      expect(quote.bidPrice).toBeUndefined();
      expect(quote.askPrice).toBeUndefined();
    });
  });

  describe("toNormalizedQuoteFromExchangeRate", () => {
    it("reconstructs providerSymbol as FROM/TO and maps the exchange rate as lastPrice", () => {
      const quote = mapper.toNormalizedQuoteFromExchangeRate(buildRate());
      expect(quote.providerSymbol).toBe("EUR/USD");
      expect(quote.lastPrice).toBe("1.0850");
      expect(quote.eventTime).toEqual(new Date("2026-01-02T16:00:01Z"));
    });

    it("passes through bid/ask when Alpha Vantage's response includes them", () => {
      const quote = mapper.toNormalizedQuoteFromExchangeRate(buildRate({ "8. Bid Price": "1.0849", "9. Ask Price": "1.0851" }));
      expect(quote.bidPrice).toBe("1.0849");
      expect(quote.askPrice).toBe("1.0851");
    });

    it("leaves bid/ask undefined when Alpha Vantage's response omits them", () => {
      const quote = mapper.toNormalizedQuoteFromExchangeRate(buildRate());
      expect(quote.bidPrice).toBeUndefined();
      expect(quote.askPrice).toBeUndefined();
    });
  });

  describe("toNormalizedCandles / toNormalizedCandle", () => {
    it("maps a time-series record into NormalizedCandle entries, one per datetime key", () => {
      const series = { "2026-01-02": bar, "2026-01-01": { ...bar, "4. close": "188.00" } };
      const candles = mapper.toNormalizedCandles(series, "IBM", "ONE_DAY");

      expect(candles).toHaveLength(2);
      const jan2 = candles.find((c) => c.eventTime.toISOString().startsWith("2026-01-02"))!;
      expect(jan2).toMatchObject({ providerSymbol: "IBM", interval: "ONE_DAY", open: "188.00", high: "190.00", low: "187.50", close: "189.42", volume: "3500000" });
    });

    it("returns an empty array for an empty series", () => {
      expect(mapper.toNormalizedCandles({}, "IBM", "ONE_DAY")).toEqual([]);
    });

    it("parses an intraday datetime (with time component) as UTC", () => {
      const candle = mapper.toNormalizedCandle("2026-01-02 16:00:00", bar, "IBM", "ONE_MINUTE");
      expect(candle.eventTime).toEqual(new Date("2026-01-02T16:00:00Z"));
    });
  });

  describe("toNormalizedSymbolSearchResults", () => {
    it("maps SYMBOL_SEARCH matches to NormalizedSymbolSearchResult, classifying asset class from the type field", () => {
      const matches: AlphaVantageSearchMatch[] = [
        { "1. symbol": "IBM", "2. name": "International Business Machines", "3. type": "Equity", "4. region": "United States", "8. currency": "USD" },
        { "1. symbol": "SPY", "2. name": "SPDR S&P 500 ETF", "3. type": "ETF", "4. region": "United States", "8. currency": "USD" },
      ];
      const results = mapper.toNormalizedSymbolSearchResults(matches);

      expect(results[0]).toEqual({ providerSymbol: "IBM", name: "International Business Machines", assetClass: "EQUITY", currency: "USD" });
      expect(results[1].assetClass).toBe("ETF");
    });

    it("returns an empty array for no matches", () => {
      expect(mapper.toNormalizedSymbolSearchResults([])).toEqual([]);
    });
  });

  describe("toCompanyOverview", () => {
    it("maps OVERVIEW response fields into AlphaVantageCompanyOverview", () => {
      const response: AlphaVantageOverviewResponse = {
        Symbol: "IBM",
        Name: "International Business Machines",
        Exchange: "NYSE",
        Currency: "USD",
        Country: "USA",
        Sector: "TECHNOLOGY",
        Industry: "COMPUTER & OFFICE EQUIPMENT",
        MarketCapitalization: "175000000000",
        PERatio: "24.5",
        DividendYield: "0.035",
        EPS: "9.12",
        "52WeekHigh": "199.99",
        "52WeekLow": "150.00",
      };

      expect(mapper.toCompanyOverview(response)).toEqual({
        symbol: "IBM",
        name: "International Business Machines",
        exchange: "NYSE",
        currency: "USD",
        country: "USA",
        sector: "TECHNOLOGY",
        industry: "COMPUTER & OFFICE EQUIPMENT",
        marketCapitalization: "175000000000",
        peRatio: "24.5",
        dividendYield: "0.035",
        eps: "9.12",
        week52High: "199.99",
        week52Low: "150.00",
      });
    });

    it("defaults symbol to an empty string when absent, rather than throwing", () => {
      expect(mapper.toCompanyOverview({}).symbol).toBe("");
    });
  });

  describe("toMarketStatusEntries", () => {
    it("passes entries through unchanged", () => {
      const entries = [{ market_type: "Equity", region: "United States", primary_exchanges: "NYSE, NASDAQ", local_open: "09:30", local_close: "16:00", current_status: "open" }];
      expect(mapper.toMarketStatusEntries(entries)).toBe(entries);
    });
  });

  describe("parseTradingDay (private, exercised via public methods)", () => {
    it("falls back to now() for an empty datetime string", () => {
      const before = Date.now();
      const quote = mapper.toNormalizedQuote(buildQuote({ "07. latest trading day": "" }));
      expect(quote.eventTime.getTime()).toBeGreaterThanOrEqual(before);
    });

    it("falls back to now() for an unparseable datetime string", () => {
      const before = Date.now();
      const quote = mapper.toNormalizedQuote(buildQuote({ "07. latest trading day": "not-a-date" }));
      expect(quote.eventTime.getTime()).toBeGreaterThanOrEqual(before);
    });
  });
});
