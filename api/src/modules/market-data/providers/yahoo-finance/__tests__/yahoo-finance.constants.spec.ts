import {
  YAHOO_CHART_INTERVAL,
  YAHOO_ASSET_CLASSES,
  YAHOO_DEFAULT_REQUESTS_PER_MINUTE,
  YAHOO_QUOTE_SUMMARY_MODULES,
  YAHOO_QUOTE_TTL_MULTIPLIER,
  YAHOO_HISTORICAL_TTL_MULTIPLIER,
  YAHOO_PROFILE_TTL_MULTIPLIER,
  YAHOO_FINANCIALS_TTL_MULTIPLIER,
  YAHOO_DIVIDENDS_TTL_MULTIPLIER,
  YAHOO_SPLITS_TTL_MULTIPLIER,
  YAHOO_EARNINGS_TTL_MULTIPLIER,
  YAHOO_QUOTE_SUMMARY_TTL_MULTIPLIER,
} from "../yahoo-finance.constants";

describe("YAHOO_CHART_INTERVAL", () => {
  it("covers exactly Daily/Weekly/Monthly, per MD-004's Historical Data section", () => {
    expect(Object.keys(YAHOO_CHART_INTERVAL).sort()).toEqual(["ONE_DAY", "ONE_MONTH", "ONE_WEEK"].sort());
    expect(YAHOO_CHART_INTERVAL.ONE_DAY).toBe("1d");
    expect(YAHOO_CHART_INTERVAL.ONE_WEEK).toBe("1wk");
    expect(YAHOO_CHART_INTERVAL.ONE_MONTH).toBe("1mo");
  });

  it("deliberately excludes intraday intervals", () => {
    expect(YAHOO_CHART_INTERVAL.ONE_MINUTE).toBeUndefined();
    expect(YAHOO_CHART_INTERVAL.ONE_HOUR).toBeUndefined();
  });
});

describe("YAHOO_ASSET_CLASSES", () => {
  it("supports EQUITY and ETF only", () => {
    expect(YAHOO_ASSET_CLASSES.sort()).toEqual(["EQUITY", "ETF"].sort());
  });
});

describe("YAHOO_QUOTE_SUMMARY_MODULES", () => {
  it("requests every module this provider's mapper reads, in one comma-joined string", () => {
    const modules = YAHOO_QUOTE_SUMMARY_MODULES.split(",");
    expect(modules).toEqual(
      expect.arrayContaining([
        "assetProfile",
        "summaryDetail",
        "price",
        "defaultKeyStatistics",
        "incomeStatementHistory",
        "balanceSheetHistory",
        "cashflowStatementHistory",
        "calendarEvents",
        "earnings",
        "fundProfile",
      ]),
    );
  });
});

describe("default rate-limit and TTL-multiplier constants", () => {
  it("defaults to a conservative, self-imposed per-minute ceiling (Yahoo publishes no official limit)", () => {
    expect(YAHOO_DEFAULT_REQUESTS_PER_MINUTE).toBeGreaterThan(0);
  });

  it("caches the (explicitly non-primary) quote at the shortest multiplier", () => {
    expect(YAHOO_QUOTE_TTL_MULTIPLIER).toBe(1);
    expect(YAHOO_HISTORICAL_TTL_MULTIPLIER).toBeGreaterThanOrEqual(YAHOO_QUOTE_TTL_MULTIPLIER);
  });

  it("caches fundamentals-style data (profile, financials, splits, quoteSummary blob) far longer than the quote", () => {
    expect(YAHOO_PROFILE_TTL_MULTIPLIER).toBeGreaterThan(YAHOO_QUOTE_TTL_MULTIPLIER);
    expect(YAHOO_FINANCIALS_TTL_MULTIPLIER).toBeGreaterThan(YAHOO_QUOTE_TTL_MULTIPLIER);
    expect(YAHOO_SPLITS_TTL_MULTIPLIER).toBeGreaterThan(YAHOO_QUOTE_TTL_MULTIPLIER);
    expect(YAHOO_QUOTE_SUMMARY_TTL_MULTIPLIER).toBeGreaterThanOrEqual(YAHOO_FINANCIALS_TTL_MULTIPLIER);
  });

  it("caches dividends/earnings at an intermediate lifetime", () => {
    expect(YAHOO_DIVIDENDS_TTL_MULTIPLIER).toBeGreaterThan(YAHOO_QUOTE_TTL_MULTIPLIER);
    expect(YAHOO_EARNINGS_TTL_MULTIPLIER).toBeGreaterThan(YAHOO_QUOTE_TTL_MULTIPLIER);
  });
});
