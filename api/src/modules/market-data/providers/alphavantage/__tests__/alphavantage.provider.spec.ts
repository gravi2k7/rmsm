import { AlphaVantageProvider } from "../alphavantage.provider";
import { AlphaVantageMapper } from "../alphavantage.mapper";
import { AlphaVantageErrorMapper } from "../alphavantage.error-mapper";
import { AlphaVantageRateLimiter } from "../alphavantage.rate-limit";
import { AlphaVantageHealthProvider } from "../alphavantage.health";
import type { AlphaVantageClient } from "../alphavantage.client";
import type { AlphaVantageCacheService } from "../alphavantage.cache";
import type { HistoricalDataRequest } from "../../../interfaces/historical-data-client.interface";
import type { MarketDataProvider } from "../../../interfaces/market-data-provider.interface";

function buildClientMock(): jest.Mocked<
  Pick<AlphaVantageClient, "getGlobalQuote" | "getTimeSeries" | "getExchangeRate" | "search" | "getOverview" | "getMarketStatus" | "ping">
> {
  return {
    getGlobalQuote: jest.fn(),
    getTimeSeries: jest.fn(),
    getExchangeRate: jest.fn(),
    search: jest.fn(),
    getOverview: jest.fn(),
    getMarketStatus: jest.fn(),
    ping: jest.fn(),
  };
}

/** A pass-through fake — exercises the real cache-miss path (fetcher always runs) without needing a real Redis connection. */
function passthroughCache(): AlphaVantageCacheService {
  return { getOrSet: jest.fn((_key: string, _ttlMs: number, fetcher: () => Promise<unknown>) => fetcher()) } as unknown as AlphaVantageCacheService;
}

function buildProvider(apiKey: string | undefined) {
  const client = buildClientMock();
  const mapper = new AlphaVantageMapper();
  const cache = passthroughCache();
  const errorMapper = new AlphaVantageErrorMapper();
  const rateLimiter = new AlphaVantageRateLimiter(5, 25);
  const healthProvider = new AlphaVantageHealthProvider(client as unknown as AlphaVantageClient, errorMapper);

  const provider = new AlphaVantageProvider(
    apiKey,
    client as unknown as AlphaVantageClient,
    mapper,
    cache,
    5000,
    rateLimiter,
    errorMapper,
    healthProvider,
  );
  return { provider, client, mapper, cache, errorMapper, rateLimiter };
}

const quoteFixture = {
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
};

describe("AlphaVantageProvider", () => {
  it("has type ALPHA_VANTAGE and lists MD-003's documented asset classes", () => {
    const { provider } = buildProvider("test-api-key");
    expect(provider.type).toBe("ALPHA_VANTAGE");
    expect(provider.metadata.assetClasses.sort()).toEqual(["CRYPTO", "EQUITY", "ETF", "FOREX"].sort());
  });

  it("is enabled when an API key is configured, and disabled (not broken) when absent", () => {
    expect(buildProvider("real-key").provider.enabled).toBe(true);
    expect(buildProvider(undefined).provider.enabled).toBe(false);
  });

  it("only exposes historicalDataClient/quoteClient/symbolSearchClient/healthProvider, matching every other provider's capability scope", () => {
    const { provider } = buildProvider("test-api-key");
    const asInterface: MarketDataProvider = provider;
    expect(provider.historicalDataClient).toBeDefined();
    expect(provider.quoteClient).toBeDefined();
    expect(provider.symbolSearchClient).toBeDefined();
    expect(provider.healthProvider).toBeDefined();
    expect(asInterface.tickProvider).toBeUndefined();
    expect(asInterface.corporateActionProvider).toBeUndefined();
  });

  describe("historicalDataClient.fetchCandles", () => {
    it("resolves the interval, calls getTimeSeries, extracts the matching seriesKey, and normalizes the result", async () => {
      const { provider, client } = buildProvider("test-api-key");
      client.getTimeSeries.mockResolvedValue({ "Time Series (Daily)": { "2026-01-02": { "1. open": "188.00", "2. high": "190.00", "3. low": "187.50", "4. close": "189.42", "5. volume": "3500000" } } });

      const request: HistoricalDataRequest = { providerSymbol: "IBM", interval: "ONE_DAY", from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-01-02T00:00:00Z") };
      const response = await provider.historicalDataClient!.fetchCandles(request);

      expect(client.getTimeSeries).toHaveBeenCalledWith("IBM", "ONE_DAY");
      expect(response.candles).toHaveLength(1);
      expect(response.candles[0].providerSymbol).toBe("IBM");
      expect(response.candles[0].close).toBe("189.42");
    });

    it("returns an empty candle array when the expected seriesKey is absent from the response", async () => {
      const { provider, client } = buildProvider("test-api-key");
      client.getTimeSeries.mockResolvedValue({});

      const request: HistoricalDataRequest = { providerSymbol: "IBM", interval: "ONE_DAY", from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-01-02T00:00:00Z") };
      const response = await provider.historicalDataClient!.fetchCandles(request);

      expect(response.candles).toEqual([]);
    });

    it("rejects an unsupported interval (FOUR_HOURS) before ever calling the client or cache", async () => {
      const { provider, client, cache } = buildProvider("test-api-key");
      const request: HistoricalDataRequest = { providerSymbol: "IBM", interval: "FOUR_HOURS", from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-01-02T00:00:00Z") };

      await expect(provider.historicalDataClient!.fetchCandles(request)).rejects.toThrow(/does not support interval "FOUR_HOURS"/);
      expect(client.getTimeSeries).not.toHaveBeenCalled();
      expect(cache.getOrSet).not.toHaveBeenCalled();
    });
  });

  describe("quoteClient.fetchLatestQuote", () => {
    it("routes a plain symbol to GLOBAL_QUOTE and maps the result", async () => {
      const { provider, client, cache } = buildProvider("test-api-key");
      client.getGlobalQuote.mockResolvedValue({ "Global Quote": quoteFixture });

      const quote = await provider.quoteClient!.fetchLatestQuote("IBM");

      expect(client.getGlobalQuote).toHaveBeenCalledWith("IBM");
      expect(cache.getOrSet).toHaveBeenCalledWith("quote:IBM", 5000, expect.any(Function));
      expect(quote.providerSymbol).toBe("IBM");
      expect(quote.lastPrice).toBe("189.42");
    });

    it("throws an isEmptyResult error when GLOBAL_QUOTE returns an empty object (Alpha Vantage's actual 'not found' shape)", async () => {
      const { provider, client, errorMapper } = buildProvider("test-api-key");
      client.getGlobalQuote.mockResolvedValue({ "Global Quote": {} });

      await expect(provider.quoteClient!.fetchLatestQuote("ZZZZ")).rejects.toMatchObject({ isEmptyResult: true });
      try {
        await provider.quoteClient!.fetchLatestQuote("ZZZZ");
      } catch (err) {
        expect(errorMapper.classify(err)).toBe("symbol_not_found");
      }
    });

    it("routes a FROM/TO providerSymbol to CURRENCY_EXCHANGE_RATE instead of GLOBAL_QUOTE", async () => {
      const { provider, client, cache } = buildProvider("test-api-key");
      client.getExchangeRate.mockResolvedValue({
        "Realtime Currency Exchange Rate": {
          "1. From_Currency Code": "EUR",
          "2. From_Currency Name": "Euro",
          "3. To_Currency Code": "USD",
          "4. To_Currency Name": "United States Dollar",
          "5. Exchange Rate": "1.0850",
          "6. Last Refreshed": "2026-01-02 16:00:01",
          "7. Time Zone": "UTC",
        },
      });

      const quote = await provider.quoteClient!.fetchLatestQuote("EUR/USD");

      expect(client.getExchangeRate).toHaveBeenCalledWith("EUR", "USD");
      expect(client.getGlobalQuote).not.toHaveBeenCalled();
      expect(cache.getOrSet).toHaveBeenCalledWith("rate:EUR:USD", 5000, expect.any(Function));
      expect(quote.providerSymbol).toBe("EUR/USD");
      expect(quote.lastPrice).toBe("1.0850");
    });

    it("throws an isEmptyResult error when the exchange-rate response has no rate object", async () => {
      const { provider, client } = buildProvider("test-api-key");
      client.getExchangeRate.mockResolvedValue({});

      await expect(provider.quoteClient!.fetchLatestQuote("EUR/USD")).rejects.toMatchObject({ isEmptyResult: true });
    });
  });

  describe("quoteClient.fetchLatestQuotes", () => {
    it("fans out to one fetchLatestQuote call per symbol (no batched GLOBAL_QUOTE exists)", async () => {
      const { provider, client } = buildProvider("test-api-key");
      client.getGlobalQuote.mockImplementation((symbol: string) => Promise.resolve({ "Global Quote": { ...quoteFixture, "01. symbol": symbol } }));

      const quotes = await provider.quoteClient!.fetchLatestQuotes(["IBM", "AAPL"]);

      expect(client.getGlobalQuote).toHaveBeenCalledTimes(2);
      expect(quotes.map((q) => q.providerSymbol)).toEqual(["IBM", "AAPL"]);
    });
  });

  describe("symbolSearchClient.search", () => {
    it("delegates to client.search, maps results, and truncates to the requested limit", async () => {
      const { provider, client } = buildProvider("test-api-key");
      client.search.mockResolvedValue({
        bestMatches: [
          { "1. symbol": "IBM", "2. name": "International Business Machines", "3. type": "Equity", "4. region": "United States", "8. currency": "USD" },
          { "1. symbol": "IBB", "2. name": "iShares Biotech ETF", "3. type": "ETF", "4. region": "United States", "8. currency": "USD" },
        ],
      });

      const results = await provider.symbolSearchClient!.search("IB", 1);

      expect(results).toHaveLength(1);
      expect(results[0].providerSymbol).toBe("IBM");
    });

    it("returns an empty array when the search response has no bestMatches", async () => {
      const { provider, client } = buildProvider("test-api-key");
      client.search.mockResolvedValue({});

      expect(await provider.symbolSearchClient!.search("ZZZ")).toEqual([]);
    });
  });

  describe("getCompanyOverview (additive, beyond MarketDataProvider)", () => {
    it("caches at the overview multiplier TTL and maps the response", async () => {
      const { provider, client, cache } = buildProvider("test-api-key");
      client.getOverview.mockResolvedValue({ Symbol: "IBM", Name: "International Business Machines", Sector: "TECHNOLOGY" });

      const overview = await provider.getCompanyOverview("IBM");

      expect(cache.getOrSet).toHaveBeenCalledWith("overview:IBM", 300_000, expect.any(Function));
      expect(overview.symbol).toBe("IBM");
      expect(overview.sector).toBe("TECHNOLOGY");
    });

    it("throws an isEmptyResult error when OVERVIEW returns no Symbol (unrecognized ticker)", async () => {
      const { provider, client } = buildProvider("test-api-key");
      client.getOverview.mockResolvedValue({});

      await expect(provider.getCompanyOverview("ZZZZ")).rejects.toMatchObject({ isEmptyResult: true });
    });
  });

  describe("getMarketStatus (additive, beyond MarketDataProvider)", () => {
    it("caches at the quote TTL and maps market status entries", async () => {
      const { provider, client, cache } = buildProvider("test-api-key");
      const markets = [{ market_type: "Equity", region: "United States", primary_exchanges: "NYSE, NASDAQ", local_open: "09:30", local_close: "16:00", current_status: "open" }];
      client.getMarketStatus.mockResolvedValue({ markets });

      const result = await provider.getMarketStatus();

      expect(cache.getOrSet).toHaveBeenCalledWith("market-status", 5000, expect.any(Function));
      expect(result).toEqual(markets);
    });

    it("returns an empty array when markets is absent", async () => {
      const { provider, client } = buildProvider("test-api-key");
      client.getMarketStatus.mockResolvedValue({});

      expect(await provider.getMarketStatus()).toEqual([]);
    });
  });
});
