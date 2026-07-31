import { MetaTrader5SymbolService } from "../metatrader5.symbol.service";
import type { MetaTrader5Client } from "../metatrader5.client";
import type { MetaTrader5CacheService } from "../metatrader5.cache";
import { MT5_SYMBOL_LIST_TTL_MULTIPLIER, MT5_SYMBOL_INFO_TTL_MULTIPLIER } from "../metatrader5.constants";

const RAW_SYMBOLS = [
  { name: "EURUSD", description: "Euro vs US Dollar", digits: 5, contractSize: 100_000, tickSize: 0.00001, tradeSessionName: "24/5" },
  { name: "GBPUSD", description: "British Pound vs US Dollar", digits: 5, contractSize: 100_000, tickSize: 0.00001, tradeSessionName: "24/5" },
];

function buildClient(overrides: Partial<MetaTrader5Client> = {}): MetaTrader5Client {
  return { request: jest.fn().mockResolvedValue(RAW_SYMBOLS), ...overrides } as unknown as MetaTrader5Client;
}

function passthroughCache(): MetaTrader5CacheService {
  return { getOrSet: jest.fn((_k: string, _ttl: number, fetcher: () => Promise<unknown>) => fetcher()) } as unknown as MetaTrader5CacheService;
}

describe("MetaTrader5SymbolService", () => {
  it("listSymbols() maps raw symbols to BrokerSymbolInfo (BR-001's own field list)", async () => {
    const service = new MetaTrader5SymbolService(buildClient(), passthroughCache(), 5_000);

    const symbols = await service.listSymbols();

    expect(symbols).toEqual([
      { symbol: "EURUSD", description: "Euro vs US Dollar", digits: 5, contractSize: 100_000, tickSize: 0.00001, tradingSession: "24/5" },
      { symbol: "GBPUSD", description: "British Pound vs US Dollar", digits: 5, contractSize: 100_000, tickSize: 0.00001, tradingSession: "24/5" },
    ]);
  });

  it("caches the symbol list under the symbol-list TTL multiplier", async () => {
    const cache = passthroughCache();
    const service = new MetaTrader5SymbolService(buildClient(), cache, 5_000);

    await service.listSymbols();

    expect(cache.getOrSet).toHaveBeenCalledWith("symbols", 5_000 * MT5_SYMBOL_LIST_TTL_MULTIPLIER, expect.any(Function));
  });

  it("searchSymbols() filters the (cached) full list client-side by symbol substring, case-insensitively", async () => {
    const service = new MetaTrader5SymbolService(buildClient(), passthroughCache(), 5_000);

    const results = await service.searchSymbols("eur");

    expect(results).toHaveLength(1);
    expect(results[0]!.symbol).toBe("EURUSD");
  });

  it("searchSymbols() also matches on description", async () => {
    const service = new MetaTrader5SymbolService(buildClient(), passthroughCache(), 5_000);

    const results = await service.searchSymbols("pound");

    expect(results).toHaveLength(1);
    expect(results[0]!.symbol).toBe("GBPUSD");
  });

  it("searchSymbols() respects the limit parameter", async () => {
    const service = new MetaTrader5SymbolService(buildClient(), passthroughCache(), 5_000);

    const results = await service.searchSymbols("USD", 1);

    expect(results).toHaveLength(1);
  });

  it("getSymbolInfo() fetches a single symbol and caches under the symbol-info TTL multiplier", async () => {
    const client = buildClient({ request: jest.fn().mockResolvedValue(RAW_SYMBOLS[0]) });
    const cache = passthroughCache();
    const service = new MetaTrader5SymbolService(client, cache, 5_000);

    const info = await service.getSymbolInfo("EURUSD");

    expect(info.symbol).toBe("EURUSD");
    expect(cache.getOrSet).toHaveBeenCalledWith("symbol:EURUSD", 5_000 * MT5_SYMBOL_INFO_TTL_MULTIPLIER, expect.any(Function));
  });
});
