import { CoinGeckoProvider } from "../coingecko.provider";
import { CoinGeckoMapper } from "../coingecko.mapper";
import { CoinGeckoErrorMapper } from "../coingecko.error-mapper";
import { CoinGeckoRateLimiter } from "../coingecko.rate-limit";
import { CoinGeckoHealthProvider } from "../coingecko.health";
import type { CoinGeckoClient } from "../coingecko.client";
import type { CoinGeckoCacheService } from "../coingecko.cache";
import type { HistoricalDataRequest } from "../../../interfaces/historical-data-client.interface";
import type { MarketDataProvider } from "../../../interfaces/market-data-provider.interface";

function buildClientMock(): jest.Mocked<Pick<CoinGeckoClient, "getMarkets" | "getOhlc" | "search" | "ping">> {
  return { getMarkets: jest.fn(), getOhlc: jest.fn(), search: jest.fn(), ping: jest.fn() };
}

/** A pass-through fake — exercises the real getOrSet() cache-miss path (fetcher always runs) without needing a real Redis connection. */
function passthroughCache(): CoinGeckoCacheService {
  return { getOrSet: jest.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()) } as unknown as CoinGeckoCacheService;
}

function buildProvider() {
  const client = buildClientMock();
  const mapper = new CoinGeckoMapper();
  const cache = passthroughCache();
  const errorMapper = new CoinGeckoErrorMapper();
  const rateLimiter = new CoinGeckoRateLimiter(30);
  const healthProvider = new CoinGeckoHealthProvider(client as unknown as CoinGeckoClient, errorMapper);

  const provider = new CoinGeckoProvider(client as unknown as CoinGeckoClient, mapper, cache, rateLimiter, errorMapper, healthProvider);
  return { provider, client, mapper, cache, errorMapper, rateLimiter };
}

const marketEntry = {
  id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  current_price: 65000,
  market_cap: 1_000_000_000,
  total_volume: 50_000_000,
  high_24h: 66000,
  low_24h: 64000,
  price_change_percentage_24h: 1.5,
  circulating_supply: 19_700_000,
  total_supply: 21_000_000,
  last_updated: "2026-01-02T16:00:00.000Z",
};

describe("CoinGeckoProvider", () => {
  it("has type COINGECKO, is crypto-only, and is always enabled (no credential gate)", () => {
    const { provider } = buildProvider();
    expect(provider.type).toBe("COINGECKO");
    expect(provider.metadata.assetClasses).toEqual(["CRYPTO"]);
    expect(provider.enabled).toBe(true);
  });

  it("only exposes historicalDataClient/quoteClient/symbolSearchClient/healthProvider, per the same capability scope as Twelve Data", () => {
    const { provider } = buildProvider();
    const asInterface: MarketDataProvider = provider;
    expect(provider.historicalDataClient).toBeDefined();
    expect(provider.quoteClient).toBeDefined();
    expect(provider.symbolSearchClient).toBeDefined();
    expect(provider.healthProvider).toBeDefined();
    expect(asInterface.tickProvider).toBeUndefined();
    expect(asInterface.corporateActionProvider).toBeUndefined();
  });

  describe("historicalDataClient.fetchCandles", () => {
    it("resolves the coin id, calls getOhlc with the resolved days, and normalizes the result", async () => {
      const { provider, client } = buildProvider();
      client.getOhlc.mockResolvedValue([[1767369600000, 64000, 65500, 63800, 65000]]);

      const request: HistoricalDataRequest = {
        providerSymbol: "BTC",
        interval: "THIRTY_MINUTES",
        from: new Date("2026-01-01T00:00:00Z"),
        to: new Date("2026-01-01T06:00:00Z"),
      };
      const response = await provider.historicalDataClient!.fetchCandles(request);

      expect(client.getOhlc).toHaveBeenCalledWith("bitcoin", 1);
      expect(response.candles).toHaveLength(1);
      expect(response.candles[0].providerSymbol).toBe("BTC");
      expect(response.candles[0].close).toBe("65000");
    });

    it("rejects an unsupported interval before ever calling the client", async () => {
      const { provider, client } = buildProvider();
      const request: HistoricalDataRequest = {
        providerSymbol: "BTC",
        interval: "ONE_DAY",
        from: new Date("2026-01-01T00:00:00Z"),
        to: new Date("2026-01-02T00:00:00Z"),
      };

      await expect(provider.historicalDataClient!.fetchCandles(request)).rejects.toThrow(/no corresponding CoinGecko granularity tier/);
      expect(client.getOhlc).not.toHaveBeenCalled();
    });
  });

  describe("quoteClient", () => {
    it("fetchLatestQuote resolves the id, fetches via cache, and maps the matching entry", async () => {
      const { provider, client, cache } = buildProvider();
      client.getMarkets.mockResolvedValue([marketEntry]);

      const quote = await provider.quoteClient!.fetchLatestQuote("BTC");

      expect(client.getMarkets).toHaveBeenCalledWith(["bitcoin"]);
      expect(cache.getOrSet).toHaveBeenCalledWith("quote:bitcoin", expect.any(Function));
      expect(quote.providerSymbol).toBe("bitcoin");
      expect(quote.lastPrice).toBe("65000");
    });

    it("fetchLatestQuote throws a symbol_not_found-classified error when the id is absent from the response", async () => {
      const { provider, client, errorMapper } = buildProvider();
      client.getMarkets.mockResolvedValue([]);

      await expect(provider.quoteClient!.fetchLatestQuote("BTC")).rejects.toMatchObject({ isUnknownSymbol: true });
      try {
        await provider.quoteClient!.fetchLatestQuote("BTC");
      } catch (err) {
        expect(errorMapper.classify(err)).toBe("symbol_not_found");
      }
    });

    it("fetchLatestQuotes issues a single batched getMarkets call for every requested symbol", async () => {
      const { provider, client } = buildProvider();
      client.getMarkets.mockResolvedValue([
        marketEntry,
        { ...marketEntry, id: "ethereum", symbol: "eth", current_price: 3500 },
      ]);

      const quotes = await provider.quoteClient!.fetchLatestQuotes(["BTC", "ETH"]);

      expect(client.getMarkets).toHaveBeenCalledTimes(1);
      expect(client.getMarkets).toHaveBeenCalledWith(["bitcoin", "ethereum"]);
      expect(quotes.map((q) => q.providerSymbol)).toEqual(["bitcoin", "ethereum"]);
    });

    it("fetchLatestQuotes throws for the specific symbol missing from a partial batch response", async () => {
      const { provider, client } = buildProvider();
      client.getMarkets.mockResolvedValue([marketEntry]); // "ethereum" missing

      await expect(provider.quoteClient!.fetchLatestQuotes(["BTC", "ETH"])).rejects.toMatchObject({ isUnknownSymbol: true });
    });
  });

  describe("symbolSearchClient.search", () => {
    it("delegates to client.search and maps + truncates to the requested limit", async () => {
      const { provider, client } = buildProvider();
      client.search.mockResolvedValue({
        coins: [
          { id: "bitcoin", name: "Bitcoin", symbol: "btc", market_cap_rank: 1 },
          { id: "bitcoin-cash", name: "Bitcoin Cash", symbol: "bch", market_cap_rank: 20 },
        ],
      });

      const results = await provider.symbolSearchClient!.search("bit", 1);

      expect(results).toHaveLength(1);
      expect(results[0].providerSymbol).toBe("bitcoin");
      expect(results[0].assetClass).toBe("CRYPTO");
    });
  });

  describe("getMarketSnapshot (additive, beyond MarketDataProvider)", () => {
    it("returns the rich market-cap/volume/change/high/low/supply fields NormalizedQuote has no room for", async () => {
      const { provider, client } = buildProvider();
      client.getMarkets.mockResolvedValue([marketEntry]);

      const snapshot = await provider.getMarketSnapshot("BTC");

      expect(snapshot.marketCapUsd).toBe(1_000_000_000);
      expect(snapshot.volume24hUsd).toBe(50_000_000);
      expect(snapshot.change24hPercent).toBe(1.5);
      expect(snapshot.circulatingSupply).toBe(19_700_000);
      expect(snapshot.totalSupply).toBe(21_000_000);
    });
  });
});
