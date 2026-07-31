import { YahooFinanceMapper } from "../yahoo-finance.mapper";
import type { YahooChartMeta, YahooChartResult, YahooQuoteSummaryResult, YahooSearchQuote, YahooSearchNewsItem } from "../yahoo-finance.types";

const meta: YahooChartMeta = {
  symbol: "AAPL",
  currency: "USD",
  regularMarketPrice: 189.42,
  previousClose: 188.1,
  regularMarketVolume: 3_500_000,
  regularMarketTime: 1767369600,
};

describe("YahooFinanceMapper", () => {
  let mapper: YahooFinanceMapper;

  beforeEach(() => {
    mapper = new YahooFinanceMapper();
  });

  describe("toNormalizedQuote", () => {
    it("maps chart meta to NormalizedQuote", () => {
      const quote = mapper.toNormalizedQuote(meta);
      expect(quote.providerSymbol).toBe("AAPL");
      expect(quote.lastPrice).toBe("189.42");
      expect(quote.eventTime).toEqual(new Date(1767369600 * 1000));
    });

    it("falls back to now() when regularMarketTime is absent", () => {
      const before = Date.now();
      const quote = mapper.toNormalizedQuote({ symbol: "AAPL" });
      expect(quote.eventTime.getTime()).toBeGreaterThanOrEqual(before);
      expect(quote.lastPrice).toBeUndefined();
    });
  });

  describe("toNormalizedCandles", () => {
    it("maps parallel timestamp/OHLCV arrays into NormalizedCandle entries", () => {
      const result: YahooChartResult = {
        meta,
        timestamp: [1767283200, 1767369600],
        indicators: { quote: [{ open: [187, 188], high: [190, 191], low: [186, 187.5], close: [188, 189.42], volume: [1000000, 3500000] }] },
      };
      const candles = mapper.toNormalizedCandles(result, "AAPL", "ONE_DAY");
      expect(candles).toHaveLength(2);
      expect(candles[1]).toMatchObject({ providerSymbol: "AAPL", interval: "ONE_DAY", open: "188", high: "191", low: "187.5", close: "189.42", volume: "3500000" });
    });

    it("skips indices where Yahoo pads with null (non-trading days) rather than emitting a zero-valued candle", () => {
      const result: YahooChartResult = {
        meta,
        timestamp: [1767283200, 1767369600],
        indicators: { quote: [{ open: [187, null], high: [190, null], low: [186, null], close: [188, null], volume: [1000000, null] }] },
      };
      const candles = mapper.toNormalizedCandles(result, "AAPL", "ONE_DAY");
      expect(candles).toHaveLength(1);
    });

    it("treats a missing volume as '0' rather than dropping the candle", () => {
      const result: YahooChartResult = {
        meta,
        timestamp: [1767283200],
        indicators: { quote: [{ open: [187], high: [190], low: [186], close: [188], volume: [null] }] },
      };
      const candles = mapper.toNormalizedCandles(result, "AAPL", "ONE_DAY");
      expect(candles[0].volume).toBe("0");
    });

    it("returns an empty array when indicators.quote is absent", () => {
      expect(mapper.toNormalizedCandles({ meta, timestamp: [1] }, "AAPL", "ONE_DAY")).toEqual([]);
    });
  });

  describe("toNormalizedSymbolSearchResults", () => {
    it("classifies ETF quoteType as ETF and everything else as EQUITY", () => {
      const quotes: YahooSearchQuote[] = [
        { symbol: "AAPL", longname: "Apple Inc.", quoteType: "EQUITY", exchange: "NMS" },
        { symbol: "SPY", shortname: "SPDR S&P 500", quoteType: "ETF", exchange: "PCX" },
        { symbol: "FXAIX", longname: "Fidelity 500 Index Fund", quoteType: "MUTUALFUND" },
      ];
      const results = mapper.toNormalizedSymbolSearchResults(quotes);
      expect(results[0]).toEqual({ providerSymbol: "AAPL", name: "Apple Inc.", assetClass: "EQUITY", exchangeCode: "NMS" });
      expect(results[1].assetClass).toBe("ETF");
      // Mutual fund has no AssetClass match — mapped to EQUITY, a documented limitation.
      expect(results[2].assetClass).toBe("EQUITY");
    });

    it("falls back to shortname then symbol when longname is absent", () => {
      const results = mapper.toNormalizedSymbolSearchResults([{ symbol: "AAPL", shortname: "Apple" }]);
      expect(results[0].name).toBe("Apple");
      const results2 = mapper.toNormalizedSymbolSearchResults([{ symbol: "AAPL" }]);
      expect(results2[0].name).toBe("AAPL");
    });
  });

  describe("toCompanyProfile", () => {
    it("maps assetProfile/price/summaryDetail fields into YahooCompanyProfileDto", () => {
      const result: YahooQuoteSummaryResult = {
        assetProfile: { sector: "TECHNOLOGY", industry: "Consumer Electronics", fullTimeEmployees: 164000, website: "https://apple.com", longBusinessSummary: "Apple designs...", country: "United States" },
        price: { longName: "Apple Inc.", exchangeName: "NMS", currency: "USD", marketCap: { raw: 3_000_000_000_000 } },
        summaryDetail: { currency: "USD" },
      };
      const profile = mapper.toCompanyProfile("AAPL", result);
      expect(profile).toEqual({
        symbol: "AAPL",
        companyName: "Apple Inc.",
        exchange: "NMS",
        currency: "USD",
        country: "United States",
        sector: "TECHNOLOGY",
        industry: "Consumer Electronics",
        employeeCount: 164000,
        website: "https://apple.com",
        businessSummary: "Apple designs...",
        marketCapitalization: 3_000_000_000_000,
      });
    });
  });

  describe("toDividendSummary", () => {
    it("maps chart events.dividends into history and summaryDetail into yield/ex-date", () => {
      const chartResult: YahooChartResult = { meta, events: { dividends: { "1767283200": { amount: 0.24, date: 1767283200 } } } };
      const summary = mapper.toDividendSummary(chartResult, { dividendYield: { raw: 0.0056 }, exDividendDate: { raw: 1767283200 } });
      expect(summary.history).toEqual([{ exDividendDate: new Date(1767283200 * 1000), amount: 0.24 }]);
      expect(summary.dividendYield).toBe(0.0056);
      expect(summary.exDividendDate).toEqual(new Date(1767283200 * 1000));
    });

    it("returns an empty history and undefined yield/ex-date when both inputs are absent", () => {
      const summary = mapper.toDividendSummary(undefined, undefined);
      expect(summary.history).toEqual([]);
      expect(summary.dividendYield).toBeUndefined();
    });
  });

  describe("toSplits", () => {
    it("maps chart events.splits into YahooSplitDto entries", () => {
      const chartResult: YahooChartResult = { meta, events: { splits: { "1000": { date: 1000, numerator: 4, denominator: 1, splitRatio: "4:1" } } } };
      expect(mapper.toSplits(chartResult)).toEqual([{ date: new Date(1000 * 1000), numerator: 4, denominator: 1, ratio: "4:1" }]);
    });

    it("returns an empty array when no events are present", () => {
      expect(mapper.toSplits(undefined)).toEqual([]);
    });
  });

  describe("toEarnings", () => {
    it("maps calendarEvents.earnings and the latest quarterly EPS entry", () => {
      const result: YahooQuoteSummaryResult = {
        calendarEvents: { earnings: { earningsDate: [{ raw: 1767283200 }] } },
        earnings: { earningsChart: { quarterly: [{ date: "1Q2025", actual: { raw: 1.5 }, estimate: { raw: 1.4 } }] } },
      };
      const earnings = mapper.toEarnings(result);
      expect(earnings.earningsDate).toEqual(new Date(1767283200 * 1000));
      expect(earnings.eps).toEqual({ actual: 1.5, estimate: 1.4 });
    });
  });

  describe("financial statements", () => {
    it("toIncomeStatement maps income statement history entries", () => {
      const lines = mapper.toIncomeStatement([{ endDate: { raw: 1000 }, totalRevenue: { raw: 500 }, netIncome: { raw: 100 } }]);
      expect(lines[0].endDate).toEqual(new Date(1000 * 1000));
      expect(lines[0].values.totalRevenue).toBe(500);
      expect(lines[0].values.netIncome).toBe(100);
    });

    it("toBalanceSheet maps balance sheet entries", () => {
      const lines = mapper.toBalanceSheet([{ totalAssets: { raw: 1000 }, totalLiab: { raw: 400 } }]);
      expect(lines[0].values.totalAssets).toBe(1000);
      expect(lines[0].values.totalLiabilities).toBe(400);
    });

    it("toCashFlowStatement maps cash flow entries", () => {
      const lines = mapper.toCashFlowStatement([{ totalCashFromOperatingActivities: { raw: 300 }, freeCashFlow: { raw: 250 } }]);
      expect(lines[0].values.operatingCashFlow).toBe(300);
      expect(lines[0].values.freeCashFlow).toBe(250);
    });

    it("returns an empty array when no entries are given", () => {
      expect(mapper.toIncomeStatement(undefined)).toEqual([]);
      expect(mapper.toBalanceSheet(undefined)).toEqual([]);
      expect(mapper.toCashFlowStatement(undefined)).toEqual([]);
    });
  });

  describe("toFundMetadata", () => {
    it("maps fundProfile fields for both ETF and mutual fund use", () => {
      const metadata = mapper.toFundMetadata({ family: "Vanguard", categoryName: "Large Blend", totalNetAssets: { raw: 1_000_000_000 }, feesExpensesInvestment: { annualReportExpenseRatio: { raw: 0.0003 } } });
      expect(metadata).toEqual({ fundFamily: "Vanguard", category: "Large Blend", totalNetAssets: 1_000_000_000, expenseRatio: 0.0003 });
    });

    it("returns all-undefined fields when fundProfile is absent (non-fund symbol)", () => {
      expect(mapper.toFundMetadata(undefined)).toEqual({ fundFamily: undefined, category: undefined, totalNetAssets: undefined, expenseRatio: undefined });
    });
  });

  describe("toNews", () => {
    it("maps search news items into YahooNewsItemDto", () => {
      const items: YahooSearchNewsItem[] = [{ title: "Apple announces...", publisher: "Reuters", link: "https://example.com/a", providerPublishTime: 1767283200 }];
      expect(mapper.toNews(items)).toEqual([{ headline: "Apple announces...", publisher: "Reuters", publishedAt: new Date(1767283200 * 1000), url: "https://example.com/a" }]);
    });

    it("returns an empty array for no news", () => {
      expect(mapper.toNews([])).toEqual([]);
    });
  });
});
