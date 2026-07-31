import { YahooFinanceProvider } from "../yahoo-finance.provider";
import { YahooFinanceMapper } from "../yahoo-finance.mapper";
import { YahooFinanceErrorMapper } from "../yahoo-finance.error-mapper";
import { YahooFinanceRateLimiter } from "../yahoo-finance.rate-limit";
import { YahooFinanceHealthProvider } from "../yahoo-finance.health";
import type { YahooFinanceClient } from "../yahoo-finance.client";
import type { YahooFinanceCacheService } from "../yahoo-finance.cache";
import type { HistoricalDataRequest } from "../../../interfaces/historical-data-client.interface";
import type { MarketDataProvider } from "../../../interfaces/market-data-provider.interface";

function buildClientMock(): jest.Mocked<Pick<YahooFinanceClient, "getChart" | "getQuoteSummary" | "search" | "ping">> {
  return { getChart: jest.fn(), getQuoteSummary: jest.fn(), search: jest.fn(), ping: jest.fn() };
}

function passthroughCache(): YahooFinanceCacheService {
  return { getOrSet: jest.fn((_key: string, _ttlMs: number, fetcher: () => Promise<unknown>) => fetcher()) } as unknown as YahooFinanceCacheService;
}

function buildProvider(enabled = true) {
  const client = buildClientMock();
  const mapper = new YahooFinanceMapper();
  const cache = passthroughCache();
  const errorMapper = new YahooFinanceErrorMapper();
  const rateLimiter = new YahooFinanceRateLimiter(30);
  const healthProvider = new YahooFinanceHealthProvider(client as unknown as YahooFinanceClient, errorMapper);

  const provider = new YahooFinanceProvider(enabled, client as unknown as YahooFinanceClient, mapper, cache, 300_000, rateLimiter, errorMapper, healthProvider);
  return { provider, client, mapper, cache, errorMapper, rateLimiter };
}

const chartMetaResponse = { chart: { result: [{ meta: { symbol: "AAPL", regularMarketPrice: 189.42, regularMarketTime: 1767369600 } }] } };

const quoteSummaryResponse = {
  quoteSummary: {
    result: [
      {
        assetProfile: { sector: "TECHNOLOGY" },
        price: { longName: "Apple Inc." },
        summaryDetail: { dividendYield: { raw: 0.005 } },
        earnings: { earningsChart: { quarterly: [{ actual: { raw: 1.5 }, estimate: { raw: 1.4 } }] } },
        incomeStatementHistory: { incomeStatementHistory: [{ totalRevenue: { raw: 100 } }] },
        balanceSheetHistory: { balanceSheetStatements: [{ totalAssets: { raw: 200 } }] },
        cashflowStatementHistory: { cashflowStatements: [{ totalCashFromOperatingActivities: { raw: 50 } }] },
        fundProfile: { family: "Vanguard", categoryName: "Large Blend" },
      },
    ],
  },
};

describe("YahooFinanceProvider", () => {
  it("has type YAHOO_FINANCE and supports EQUITY/ETF asset classes", () => {
    const { provider } = buildProvider();
    expect(provider.type).toBe("YAHOO_FINANCE");
    expect(provider.metadata.assetClasses.sort()).toEqual(["EQUITY", "ETF"].sort());
  });

  it("is enabled/disabled purely by the YAHOO_ENABLED flag, not by any credential", () => {
    expect(buildProvider(true).provider.enabled).toBe(true);
    expect(buildProvider(false).provider.enabled).toBe(false);
  });

  it("exposes historicalDataClient/quoteClient/symbolSearchClient/healthProvider, matching every other provider's capability scope", () => {
    const { provider } = buildProvider();
    const asInterface: MarketDataProvider = provider;
    expect(provider.historicalDataClient).toBeDefined();
    expect(provider.quoteClient).toBeDefined();
    expect(provider.symbolSearchClient).toBeDefined();
    expect(provider.healthProvider).toBeDefined();
    expect(asInterface.tickProvider).toBeUndefined();
  });

  describe("historicalDataClient.fetchCandles", () => {
    it("passes from/to as period1/period2 and normalizes the result", async () => {
      const { provider, client } = buildProvider();
      client.getChart.mockResolvedValue({
        chart: { result: [{ meta: { symbol: "AAPL" }, timestamp: [1767283200], indicators: { quote: [{ open: [188], high: [190], low: [187], close: [189], volume: [1000] }] } }] },
      });

      const request: HistoricalDataRequest = { providerSymbol: "AAPL", interval: "ONE_DAY", from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-01-02T00:00:00Z") };
      const response = await provider.historicalDataClient!.fetchCandles(request);

      expect(client.getChart).toHaveBeenCalledWith("AAPL", "ONE_DAY", { period1: 1767225600, period2: 1767312000 });
      expect(response.candles).toHaveLength(1);
      expect(response.candles[0].close).toBe("189");
    });

    it("returns an empty candle array when chart.result is absent", async () => {
      const { provider, client } = buildProvider();
      client.getChart.mockResolvedValue({ chart: { result: null } });

      const request: HistoricalDataRequest = { providerSymbol: "AAPL", interval: "ONE_DAY", from: new Date(), to: new Date() };
      expect((await provider.historicalDataClient!.fetchCandles(request)).candles).toEqual([]);
    });
  });

  describe("quoteClient (explicitly non-primary)", () => {
    it("fetchLatestQuote uses a 5-day chart range and maps the meta block", async () => {
      const { provider, client, cache } = buildProvider();
      client.getChart.mockResolvedValue(chartMetaResponse);

      const quote = await provider.quoteClient!.fetchLatestQuote("AAPL");

      expect(client.getChart).toHaveBeenCalledWith("AAPL", "ONE_DAY", { range: "5d" });
      expect(cache.getOrSet).toHaveBeenCalledWith("quote:AAPL", 300_000, expect.any(Function));
      expect(quote.providerSymbol).toBe("AAPL");
      expect(quote.lastPrice).toBe("189.42");
    });

    it("throws isInvalidSymbol when chart.result is absent", async () => {
      const { provider, client, errorMapper } = buildProvider();
      client.getChart.mockResolvedValue({ chart: { result: null } });

      await expect(provider.quoteClient!.fetchLatestQuote("ZZZZ")).rejects.toMatchObject({ isInvalidSymbol: true });
      try {
        await provider.quoteClient!.fetchLatestQuote("ZZZZ");
      } catch (err) {
        expect(errorMapper.classify(err)).toBe("symbol_not_found");
      }
    });

    it("fetchLatestQuotes fans out to one call per symbol", async () => {
      const { provider, client } = buildProvider();
      client.getChart.mockResolvedValue(chartMetaResponse);

      const quotes = await provider.quoteClient!.fetchLatestQuotes(["AAPL", "MSFT"]);

      expect(client.getChart).toHaveBeenCalledTimes(2);
      expect(quotes).toHaveLength(2);
    });
  });

  describe("symbolSearchClient.search", () => {
    it("delegates to client.search, maps, and truncates to the requested limit", async () => {
      const { provider, client } = buildProvider();
      client.search.mockResolvedValue({ quotes: [{ symbol: "AAPL", longname: "Apple Inc.", quoteType: "EQUITY" }, { symbol: "AAPU", longname: "Direxion AAPL Bull 2X", quoteType: "ETF" }] });

      const results = await provider.symbolSearchClient!.search("app", 1);

      expect(results).toHaveLength(1);
      expect(results[0].providerSymbol).toBe("AAPL");
    });

    it("returns an empty array when the search response has no quotes", async () => {
      const { provider, client } = buildProvider();
      client.search.mockResolvedValue({});
      expect(await provider.symbolSearchClient!.search("zzz")).toEqual([]);
    });
  });

  describe("additive quoteSummary-backed methods", () => {
    it("getCompanyProfile fetches quoteSummary and maps assetProfile/price", async () => {
      const { provider, client, cache } = buildProvider();
      client.getQuoteSummary.mockResolvedValue(quoteSummaryResponse);

      const profile = await provider.getCompanyProfile("AAPL");

      expect(cache.getOrSet).toHaveBeenCalledWith("quotesummary:AAPL", expect.any(Number), expect.any(Function));
      expect(profile.sector).toBe("TECHNOLOGY");
      expect(profile.companyName).toBe("Apple Inc.");
    });

    it("getCompanyProfile throws isInvalidSymbol when quoteSummary.result is absent", async () => {
      const { provider, client } = buildProvider();
      client.getQuoteSummary.mockResolvedValue({ quoteSummary: { result: null } });

      await expect(provider.getCompanyProfile("ZZZZ")).rejects.toMatchObject({ isInvalidSymbol: true });
    });

    it("getEarnings maps quarterly EPS data", async () => {
      const { provider, client } = buildProvider();
      client.getQuoteSummary.mockResolvedValue(quoteSummaryResponse);

      const earnings = await provider.getEarnings("AAPL");
      expect(earnings.eps).toEqual({ actual: 1.5, estimate: 1.4 });
    });

    it("getIncomeStatement/getBalanceSheet/getCashFlowStatement each map their own history array", async () => {
      const { provider, client } = buildProvider();
      client.getQuoteSummary.mockResolvedValue(quoteSummaryResponse);

      expect((await provider.getIncomeStatement("AAPL"))[0].values.totalRevenue).toBe(100);
      expect((await provider.getBalanceSheet("AAPL"))[0].values.totalAssets).toBe(200);
      expect((await provider.getCashFlowStatement("AAPL"))[0].values.operatingCashFlow).toBe(50);
    });

    it("getEtfMetadata and getMutualFundMetadata both map the same fundProfile module", async () => {
      const { provider, client } = buildProvider();
      client.getQuoteSummary.mockResolvedValue(quoteSummaryResponse);

      const etf = await provider.getEtfMetadata("SPY");
      const fund = await provider.getMutualFundMetadata("FXAIX");
      expect(etf).toEqual(fund);
      expect(etf.fundFamily).toBe("Vanguard");
    });
  });

  describe("dividends and splits (chart events)", () => {
    it("getDividends combines chart events with quoteSummary yield/ex-date", async () => {
      const { provider, client } = buildProvider();
      client.getChart.mockResolvedValue({ chart: { result: [{ meta: { symbol: "AAPL" }, events: { dividends: { "1000": { amount: 0.24, date: 1000 } } } }] } });
      client.getQuoteSummary.mockResolvedValue(quoteSummaryResponse);

      const dividends = await provider.getDividends("AAPL");

      expect(dividends.history).toEqual([{ exDividendDate: new Date(1000 * 1000), amount: 0.24 }]);
      expect(dividends.dividendYield).toBe(0.005);
    });

    it("getSplits maps chart events.splits", async () => {
      const { provider, client } = buildProvider();
      client.getChart.mockResolvedValue({ chart: { result: [{ meta: { symbol: "AAPL" }, events: { splits: { "500": { date: 500, numerator: 4, denominator: 1, splitRatio: "4:1" } } } }] } });

      const splits = await provider.getSplits("AAPL");
      expect(splits).toEqual([{ date: new Date(500 * 1000), numerator: 4, denominator: 1, ratio: "4:1" }]);
    });
  });

  describe("getNews (optional enrichment)", () => {
    it("maps search news results", async () => {
      const { provider, client } = buildProvider();
      client.search.mockResolvedValue({ news: [{ title: "Apple news", publisher: "Reuters", providerPublishTime: 1000, link: "https://example.com" }] });

      const news = await provider.getNews("AAPL");
      expect(news).toEqual([{ headline: "Apple news", publisher: "Reuters", publishedAt: new Date(1000 * 1000), url: "https://example.com" }]);
    });
  });
});
