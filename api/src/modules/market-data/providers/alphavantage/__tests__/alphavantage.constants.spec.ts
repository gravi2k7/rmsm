import {
  parseCurrencyPair,
  ALPHA_VANTAGE_INTERVAL_FUNCTION,
  ALPHA_VANTAGE_ASSET_CLASSES,
  ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_MINUTE,
  ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY,
  ALPHA_VANTAGE_QUOTE_TTL_MULTIPLIER,
  ALPHA_VANTAGE_EXCHANGE_RATE_TTL_MULTIPLIER,
  ALPHA_VANTAGE_HISTORICAL_TTL_MULTIPLIER,
  ALPHA_VANTAGE_OVERVIEW_TTL_MULTIPLIER,
} from "../alphavantage.constants";

describe("parseCurrencyPair", () => {
  it("splits a FROM/TO providerSymbol into upper-cased currency codes", () => {
    expect(parseCurrencyPair("EUR/USD")).toEqual({ fromCurrency: "EUR", toCurrency: "USD" });
    expect(parseCurrencyPair("btc/usd")).toEqual({ fromCurrency: "BTC", toCurrency: "USD" });
  });

  it("returns null for a plain equity symbol with no slash", () => {
    expect(parseCurrencyPair("IBM")).toBeNull();
    expect(parseCurrencyPair("AAPL")).toBeNull();
  });

  it("returns null for a malformed pair (missing side, or more than one slash)", () => {
    expect(parseCurrencyPair("EUR/")).toBeNull();
    expect(parseCurrencyPair("/USD")).toBeNull();
    expect(parseCurrencyPair("EUR/USD/GBP")).toBeNull();
    expect(parseCurrencyPair("")).toBeNull();
  });
});

describe("ALPHA_VANTAGE_INTERVAL_FUNCTION", () => {
  it("covers exactly the 7 MD-003-supported intervals, deliberately excluding FOUR_HOURS", () => {
    expect(Object.keys(ALPHA_VANTAGE_INTERVAL_FUNCTION).sort()).toEqual(
      ["FIFTEEN_MINUTES", "FIVE_MINUTES", "ONE_DAY", "ONE_HOUR", "ONE_MINUTE", "ONE_MONTH", "ONE_WEEK", "THIRTY_MINUTES"].sort(),
    );
    expect(ALPHA_VANTAGE_INTERVAL_FUNCTION.FOUR_HOURS).toBeUndefined();
  });

  it("maps every intraday interval to TIME_SERIES_INTRADAY with its own interval param and seriesKey", () => {
    expect(ALPHA_VANTAGE_INTERVAL_FUNCTION.ONE_MINUTE).toEqual({ fn: "TIME_SERIES_INTRADAY", interval: "1min", seriesKey: "Time Series (1min)" });
    expect(ALPHA_VANTAGE_INTERVAL_FUNCTION.ONE_HOUR).toEqual({ fn: "TIME_SERIES_INTRADAY", interval: "60min", seriesKey: "Time Series (60min)" });
  });

  it("maps daily/weekly/monthly to their dedicated functions with no interval param", () => {
    expect(ALPHA_VANTAGE_INTERVAL_FUNCTION.ONE_DAY).toEqual({ fn: "TIME_SERIES_DAILY", seriesKey: "Time Series (Daily)" });
    expect(ALPHA_VANTAGE_INTERVAL_FUNCTION.ONE_WEEK).toEqual({ fn: "TIME_SERIES_WEEKLY", seriesKey: "Weekly Time Series" });
    expect(ALPHA_VANTAGE_INTERVAL_FUNCTION.ONE_MONTH).toEqual({ fn: "TIME_SERIES_MONTHLY", seriesKey: "Monthly Time Series" });
  });
});

describe("ALPHA_VANTAGE_ASSET_CLASSES", () => {
  it("matches MD-003's documented Supported Assets list", () => {
    expect(ALPHA_VANTAGE_ASSET_CLASSES.sort()).toEqual(["CRYPTO", "EQUITY", "ETF", "FOREX"].sort());
  });
});

describe("default rate-limit and TTL-multiplier constants", () => {
  it("defaults to Alpha Vantage's documented free-tier ceilings", () => {
    expect(ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_MINUTE).toBe(5);
    expect(ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY).toBe(25);
  });

  it("applies quotes/exchange-rates at the base TTL (1x) and historical/overview at longer multiples", () => {
    expect(ALPHA_VANTAGE_QUOTE_TTL_MULTIPLIER).toBe(1);
    expect(ALPHA_VANTAGE_EXCHANGE_RATE_TTL_MULTIPLIER).toBe(1);
    expect(ALPHA_VANTAGE_HISTORICAL_TTL_MULTIPLIER).toBeGreaterThan(1);
    expect(ALPHA_VANTAGE_OVERVIEW_TTL_MULTIPLIER).toBeGreaterThan(ALPHA_VANTAGE_HISTORICAL_TTL_MULTIPLIER);
  });
});
