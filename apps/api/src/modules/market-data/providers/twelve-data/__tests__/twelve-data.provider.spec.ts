import { TwelveDataProvider } from "../twelve-data.provider";
import { TwelveDataMapper } from "../twelve-data.mapper";
import { TwelveDataErrorMapper } from "../twelve-data.error-mapper";
import { TwelveDataRateLimiter } from "../twelve-data.rate-limit";
import { TwelveDataHealthProvider } from "../twelve-data.health";
import type { TwelveDataClient } from "../twelve-data.client";
import type { HistoricalDataRequest } from "../../../interfaces/historical-data-client.interface";
import type { MarketDataProvider } from "../../../interfaces/market-data-provider.interface";

function buildClientMock(): jest.Mocked<
  Pick<
    TwelveDataClient,
    | "getTimeSeries"
    | "getQuote"
    | "getSymbolSearch"
    | "getExchanges"
    | "getStocks"
    | "getForexPairs"
    | "getCryptocurrencies"
    | "getEtfs"
    | "getCommodities"
    | "ping"
  >
> {
  return {
    getTimeSeries: jest.fn(),
    getQuote: jest.fn(),
    getSymbolSearch: jest.fn(),
    getExchanges: jest.fn(),
    getStocks: jest.fn(),
    getForexPairs: jest.fn(),
    getCryptocurrencies: jest.fn(),
    getEtfs: jest.fn(),
    getCommodities: jest.fn(),
    ping: jest.fn(),
  };
}

function buildProvider(apiKey?: string) {
  const client = buildClientMock();
  const mapper = new TwelveDataMapper();
  const errorMapper = new TwelveDataErrorMapper();
  const rateLimiter = new TwelveDataRateLimiter(8);
  const healthProvider = new TwelveDataHealthProvider(client as unknown as TwelveDataClient, errorMapper);

  const provider = new TwelveDataProvider(apiKey, client as unknown as TwelveDataClient, mapper, rateLimiter, errorMapper, healthProvider);
  return { provider, client, mapper, errorMapper, rateLimiter, healthProvider };
}

describe("TwelveDataProvider", () => {
  it("has type TWELVE_DATA and correct capability metadata", () => {
    const { provider } = buildProvider("test-api-key");
    expect(provider.type).toBe("TWELVE_DATA");
    expect(provider.metadata.supportsHistorical).toBe(true);
    expect(provider.metadata.supportsQuotes).toBe(true);
    expect(provider.metadata.supportsTicks).toBe(false);
    expect(provider.metadata.supportsStreaming).toBe(false);
    expect(provider.metadata.supportsCorporateActions).toBe(false);
    expect(provider.metadata.rateLimits.requestsPerMinute).toBe(8);
  });

  it("exposes historical/quote/search/reference-data/health capabilities but not unsupported capabilities", () => {
    const { provider } = buildProvider("test-api-key");
    const asInterface: MarketDataProvider = provider;
    expect(provider.historicalDataClient).toBeDefined();
    expect(provider.quoteClient).toBeDefined();
    expect(provider.symbolSearchClient).toBeDefined();
    expect(provider.healthProvider).toBeDefined();
    expect(asInterface.tickProvider).toBeUndefined();
    expect(asInterface.corporateActionProvider).toBeUndefined();
    expect(asInterface.referenceDataProvider).toBeDefined();
    expect(asInterface.instrumentProvider).toBeUndefined();
  });

  describe("referenceDataProvider", () => {
    it("fetchExchanges delegates to the client and normalizes the result", async () => {
      const { provider, client } = buildProvider("test-api-key");

      client.getExchanges.mockResolvedValue({
        status: "ok",
        data: [
          {
            title: "NASDAQ Stock Market",
            name: "NASDAQ",
            code: "XNAS",
            country: "United States",
            timezone: "America/New_York",
          },
        ],
      });

      const exchanges =
        await provider.referenceDataProvider!.fetchExchanges();

      expect(client.getExchanges).toHaveBeenCalledWith();
      expect(exchanges).toEqual([
        {
          code: "XNAS",
          name: "NASDAQ",
          country: "United States",
          timezone: "America/New_York",
        },
      ]);
    });

    it("fetchInstrumentUniverse loads all reference catalogs and normalizes them", async () => {
      const { provider, client } = buildProvider("test-api-key");

      client.getStocks.mockResolvedValue({
        status: "ok",
        data: [
          {
            symbol: "AAPL",
            name: "Apple Inc",
            currency: "USD",
            exchange: "NASDAQ",
            mic_code: "XNAS",
            country: "United States",
            type: "Common Stock",
          },
        ],
      });

      client.getEtfs.mockResolvedValue({
        status: "ok",
        data: [
          {
            symbol: "SPY",
            name: "SPDR S&P 500 ETF Trust",
            currency: "USD",
            exchange: "NYSE Arca",
            mic_code: "ARCX",
            country: "United States",
            isin: "US78462F1030",
          },
        ],
      });

      client.getForexPairs.mockResolvedValue({
        status: "ok",
        data: [
          {
            symbol: "EUR/USD",
            currency_group: "EUR",
            currency_base: "EUR",
            currency_quote: "USD",
          },
        ],
      });

      client.getCryptocurrencies.mockResolvedValue({
        status: "ok",
        data: [
          {
            symbol: "BTC/USD",
            available_exchanges: ["Coinbase"],
            currency_base: "BTC",
            currency_quote: "USD",
          },
        ],
      });

      client.getCommodities.mockResolvedValue({
        status: "ok",
        data: [
          {
            symbol: "XAU/USD",
            name: "Gold",
            currency: "USD",
            exchange: "COMEX",
            country: "United States",
          },
        ],
      });

      const instruments =
        await provider.referenceDataProvider!.fetchInstrumentUniverse();

      expect(client.getStocks).toHaveBeenCalledWith(1, 5000);
      expect(client.getEtfs).toHaveBeenCalledWith(1, 5000);
      expect(client.getForexPairs).toHaveBeenCalledWith(1, 5000);
      expect(client.getCryptocurrencies).toHaveBeenCalledWith(1, 5000);
      expect(client.getCommodities).toHaveBeenCalledWith(1, 5000);

      expect(instruments).toHaveLength(5);

      expect(instruments.map((instrument) => instrument.providerSymbol)).toEqual([
        "AAPL",
        "SPY",
        "EUR/USD",
        "BTC/USD",
        "XAU/USD",
      ]);

      expect(instruments[0]).toMatchObject({
        providerSymbol: "AAPL",
        name: "Apple Inc",
        assetClass: "EQUITY",
        currency: "USD",
        exchangeCode: "XNAS",
      });

      expect(instruments[1]).toMatchObject({
        providerSymbol: "SPY",
        assetClass: "ETF",
        exchangeCode: "ARCX",
        isin: "US78462F1030",
      });

      expect(instruments[2]).toMatchObject({
        providerSymbol: "EUR/USD",
        assetClass: "FOREX",
        currency: "USD",
      });

      expect(instruments[3]).toMatchObject({
        providerSymbol: "BTC/USD",
        assetClass: "CRYPTO",
        currency: "USD",
        exchangeCode: "Coinbase",
      });

      expect(instruments[4]).toMatchObject({
        providerSymbol: "XAU/USD",
        assetClass: "COMMODITY",
        currency: "USD",
        exchangeCode: undefined,
      });
    });

    it("fetchInstrumentUniverse filters normalized instruments by exchange code", async () => {
      const { provider, client } = buildProvider("test-api-key");

      client.getStocks.mockResolvedValue({
        status: "ok",
        data: [
          {
            symbol: "AAPL",
            name: "Apple Inc",
            currency: "USD",
            exchange: "NASDAQ",
            mic_code: "XNAS",
            country: "United States",
            type: "Common Stock",
          },
          {
            symbol: "MSFT",
            name: "Microsoft Corporation",
            currency: "USD",
            exchange: "NASDAQ",
            mic_code: "XNAS",
            country: "United States",
            type: "Common Stock",
          },
        ],
      });

      client.getEtfs.mockResolvedValue({
        status: "ok",
        data: [],
      });

      client.getForexPairs.mockResolvedValue({
        status: "ok",
        data: [],
      });

      client.getCryptocurrencies.mockResolvedValue({
        status: "ok",
        data: [],
      });

      client.getCommodities.mockResolvedValue({
        status: "ok",
        data: [],
      });

      const instruments =
        await provider.referenceDataProvider!.fetchInstrumentUniverse(
          "xnas",
        );

      expect(instruments).toHaveLength(2);
      expect(instruments.map((instrument) => instrument.providerSymbol)).toEqual([
        "AAPL",
        "MSFT",
      ]);
    });
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
      const { provider, client } = buildProvider("test-api-key");
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
      const { provider, client } = buildProvider("test-api-key");
      client.getQuote.mockResolvedValue({ symbol: "AAPL", close: "150.00", status: "ok" });

      const quote = await provider.quoteClient!.fetchLatestQuote("AAPL");

      expect(client.getQuote).toHaveBeenCalledWith("AAPL");
      expect(quote.providerSymbol).toBe("AAPL");
      expect(quote.lastPrice).toBe("150.00");
    });

    it("fetchLatestQuotes fans out to fetchLatestQuote for every symbol", async () => {
      const { provider, client } = buildProvider("test-api-key");
      client.getQuote.mockImplementation((symbol: string) => Promise.resolve({ symbol, close: "1.00", status: "ok" }));

      const quotes = await provider.quoteClient!.fetchLatestQuotes(["AAPL", "MSFT"]);

      expect(client.getQuote).toHaveBeenCalledTimes(2);
      expect(quotes.map((q) => q.providerSymbol)).toEqual(["AAPL", "MSFT"]);
    });
  });

  describe("symbolSearchClient.search", () => {
    it("delegates to the client and maps + truncates to the requested limit", async () => {
      const { provider, client } = buildProvider("test-api-key");
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
