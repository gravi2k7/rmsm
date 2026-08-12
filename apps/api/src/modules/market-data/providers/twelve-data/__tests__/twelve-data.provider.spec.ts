import { TwelveDataProvider } from "../twelve-data.provider";
import { TwelveDataMapper } from "../twelve-data.mapper";
import { TwelveDataErrorMapper } from "../twelve-data.error-mapper";
import { TwelveDataRateLimiter } from "../twelve-data.rate-limit";
import { TwelveDataHealthProvider } from "../twelve-data.health";
import type { TwelveDataClient } from "../twelve-data.client";
import type { HistoricalDataRequest } from "../../../interfaces/historical-data-client.interface";
import type { MarketDataProvider } from "../../../interfaces/market-data-provider.interface";

function buildClientMock(): jest.Mocked<Pick<TwelveDataClient, "getTimeSeries" | "getQuote" | "getSymbolSearch" | "ping">> {
  return {
    getTimeSeries: jest.fn(),
    getQuote: jest.fn(),
    getSymbolSearch: jest.fn(),
    ping: jest.fn(),
  };
}

function buildProvider(apiKey?: string) {
  const resolvedApiKey = arguments.length === 0 ? "test-api-key" : apiKey;

  const client = buildClientMock();
  const mapper = new TwelveDataMapper();
  const errorMapper = new TwelveDataErrorMapper();
  const rateLimiter = new TwelveDataRateLimiter(8);
  const healthProvider = new TwelveDataHealthProvider(client as unknown as TwelveDataClient, errorMapper);

  const provider = new TwelveDataProvider(resolvedApiKey, client as unknown as TwelveDataClient, mapper, rateLimiter, errorMapper, healthProvider);
  return { provider, client, mapper, errorMapper, rateLimiter, healthProvider };
}

describe("TwelveDataProvider", () => {
  it("has type TWELVE_DATA and correct capability metadata", () => {
    const { provider } = buildProvider();
    expect(provider.type).toBe("TWELVE_DATA");
    expect(provider.metadata.supportsHistorical).toBe(true);
    expect(provider.metadata.supportsQuotes).toBe(true);
    expect(provider.metadata.supportsTicks).toBe(false);
    expect(provider.metadata.supportsStreaming).toBe(false);
    expect(provider.metadata.supportsCorporateActions).toBe(false);
    expect(provider.metadata.rateLimits.requestsPerMinute).toBe(8);
  });

  it("only exposes historicalDataClient/quoteClient/symbolSearchClient/healthProvider — never tickProvider/corporateActionProvider/etc, per MD-001's capability scope", () => {
    const { provider } = buildProvider();
    const asInterface: MarketDataProvider = provider;
    expect(provider.historicalDataClient).toBeDefined();
    expect(provider.quoteClient).toBeDefined();
    expect(provider.symbolSearchClient).toBeDefined();
    expect(provider.healthProvider).toBeDefined();
    expect(asInterface.tickProvider).toBeUndefined();
    expect(asInterface.corporateActionProvider).toBeUndefined();
    expect(asInterface.referenceDataProvider).toBeUndefined();
    expect(asInterface.instrumentProvider).toBeUndefined();
  });

  describe("enabled", () => {
    it("is enabled when an API key is present", () => {
      expect(buildProvider("a-real-key").provider.enabled).toBe(true);
    });

    it("is disabled (not broken) when the API key is absent", () => {
      expect(buildProvider(undefined).provider.enabled).toBe(false);
    });
  });

  describe("historicalDataClient.fetchCandles", () => {
    it("delegates to the client and normalizes the result via the mapper", async () => {
      const { provider, client } = buildProvider();
      client.getTimeSeries.mockResolvedValue({
        status: "ok",
        values: [{ datetime: "2026-01-02", open: "1", high: "2", low: "0.5", close: "1.5", volume: "100" }],
      });

      const request: HistoricalDataRequest = {
        providerSymbol: "AAPL",
        interval: "ONE_DAY",
        from: new Date("2026-01-01T00:00:00Z"),
        to: new Date("2026-01-02T00:00:00Z"),
      };
      const response = await provider.historicalDataClient!.fetchCandles(request);

      expect(client.getTimeSeries).toHaveBeenCalledWith({
        symbol: "AAPL",
        interval: "ONE_DAY",
        startDate: request.from,
        endDate: request.to,
      });
      expect(response.candles).toHaveLength(1);

      const candle = response.candles[0]!;
      expect(candle.providerSymbol).toBe("AAPL");
      expect(candle.close).toBe("1.5");
    });
  });

  describe("quoteClient", () => {
    it("fetchLatestQuote delegates to the client and maps the result", async () => {
      const { provider, client } = buildProvider();
      client.getQuote.mockResolvedValue({ symbol: "AAPL", close: "150.00", status: "ok" });

      const quote = await provider.quoteClient!.fetchLatestQuote("AAPL");

      expect(client.getQuote).toHaveBeenCalledWith("AAPL");
      expect(quote.providerSymbol).toBe("AAPL");
      expect(quote.lastPrice).toBe("150.00");
    });

    it("fetchLatestQuotes fans out to fetchLatestQuote for every symbol", async () => {
      const { provider, client } = buildProvider();
      client.getQuote.mockImplementation((symbol: string) => Promise.resolve({ symbol, close: "1.00", status: "ok" }));

      const quotes = await provider.quoteClient!.fetchLatestQuotes(["AAPL", "MSFT"]);

      expect(client.getQuote).toHaveBeenCalledTimes(2);
      expect(quotes.map((q) => q.providerSymbol)).toEqual(["AAPL", "MSFT"]);
    });
  });

  describe("symbolSearchClient.search", () => {
    it("delegates to the client and maps + truncates to the requested limit", async () => {
      const { provider, client } = buildProvider();
      client.getSymbolSearch.mockResolvedValue({
        status: "ok",
        data: [
          { symbol: "AAPL", instrument_name: "Apple Inc", instrument_type: "Common Stock", currency: "USD" },
          { symbol: "AAPL.MX", instrument_name: "Apple Inc (MX)", instrument_type: "Common Stock", currency: "MXN" },
        ],
      });

      const results = await provider.symbolSearchClient!.search("apple", 1);

      expect(client.getSymbolSearch).toHaveBeenCalledWith("apple", 1);
      expect(results).toHaveLength(1);

      const result = results[0]!;
      expect(result.providerSymbol).toBe("AAPL");
    });
  });
});
