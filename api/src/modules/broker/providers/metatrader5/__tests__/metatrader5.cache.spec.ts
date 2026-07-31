import type { Env } from "@rmsm/config";

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDel = jest.fn();
const mockOn = jest.fn();
const mockDisconnect = jest.fn();

jest.mock("ioredis", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      get: mockGet,
      set: mockSet,
      del: mockDel,
      on: mockOn,
      disconnect: mockDisconnect,
    })),
  };
});

import { MetaTrader5CacheService } from "../metatrader5.cache";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return { REDIS_URL: "redis://localhost:6379", ...overrides } as Env;
}

describe("MetaTrader5CacheService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockDel.mockReset();
    mockOn.mockReset();
    mockDisconnect.mockReset();
  });

  it("calls fetcher and caches under the mt5: prefix on a miss", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const cache = new MetaTrader5CacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue({ balance: 10_000 });

    const result = await cache.getOrSet("account", 5_000, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ balance: 10_000 });
    expect(mockSet).toHaveBeenCalledWith("mt5:account", JSON.stringify({ balance: 10_000 }), "PX", 5_000);
  });

  it("returns the cached value on a hit without calling fetcher", async () => {
    mockGet.mockResolvedValue(JSON.stringify({ balance: 10_000 }));
    const cache = new MetaTrader5CacheService(buildEnv());
    const fetcher = jest.fn();

    const result = await cache.getOrSet("account", 5_000, fetcher);

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({ balance: 10_000 });
  });

  it("falls through to fetcher without throwing when Redis read fails", async () => {
    mockGet.mockRejectedValue(new Error("ECONNREFUSED"));
    mockSet.mockRejectedValue(new Error("ECONNREFUSED"));
    const cache = new MetaTrader5CacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue({ symbol: "EURUSD" });

    await expect(cache.getOrSet("symbols", 5_000, fetcher)).resolves.toEqual({ symbol: "EURUSD" });
  });

  it("invalidate() deletes the prefixed key", async () => {
    mockDel.mockResolvedValue(1);
    const cache = new MetaTrader5CacheService(buildEnv());

    await cache.invalidate("account");

    expect(mockDel).toHaveBeenCalledWith("mt5:account");
  });

  it("invalidate() does not throw when Redis is unavailable", async () => {
    mockDel.mockRejectedValue(new Error("ECONNREFUSED"));
    const cache = new MetaTrader5CacheService(buildEnv());

    await expect(cache.invalidate("account")).resolves.toBeUndefined();
  });
});
