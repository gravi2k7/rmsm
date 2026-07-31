import type { Env } from "@rmsm/config";

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockOn = jest.fn();
const mockDisconnect = jest.fn();

jest.mock("ioredis", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      get: mockGet,
      set: mockSet,
      on: mockOn,
      disconnect: mockDisconnect,
    })),
  };
});

// Imported after the mock so AlphaVantageCacheService's `new Redis(...)` resolves to the mock above.
import { AlphaVantageCacheService } from "../alphavantage.cache";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
    REDIS_URL: "redis://localhost:6379",
    MARKET_DATA_CACHE_TTL_MS: 5000,
    ...overrides,
  } as Env;
}

describe("AlphaVantageCacheService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockOn.mockReset();
    mockDisconnect.mockReset();
  });

  it("calls fetcher and caches the result at the caller-supplied ttlMs on a miss", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const cache = new AlphaVantageCacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue({ price: "189.42" });

    const result = await cache.getOrSet("quote:IBM", 5000, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ price: "189.42" });
    expect(mockSet).toHaveBeenCalledWith("alphavantage:quote:IBM", JSON.stringify({ price: "189.42" }), "PX", 5000);
  });

  it("returns the cached value and never calls fetcher on a hit", async () => {
    mockGet.mockResolvedValue(JSON.stringify({ price: "189.42" }));
    const cache = new AlphaVantageCacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue({ price: "999.99" });

    const result = await cache.getOrSet("quote:IBM", 5000, fetcher);

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({ price: "189.42" });
  });

  it("honors a different ttlMs per call — the whole point of AlphaVantageCacheService vs. CoinGeckoCacheService's fixed TTL", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const cache = new AlphaVantageCacheService(buildEnv({ MARKET_DATA_CACHE_TTL_MS: 5000 }));

    await cache.getOrSet("quote:IBM", 5000, async () => "quote");
    await cache.getOrSet("overview:IBM", 300_000, async () => "overview");

    expect(mockSet).toHaveBeenNthCalledWith(1, "alphavantage:quote:IBM", JSON.stringify("quote"), "PX", 5000);
    expect(mockSet).toHaveBeenNthCalledWith(2, "alphavantage:overview:IBM", JSON.stringify("overview"), "PX", 300_000);
  });

  it("falls through to fetcher (cache-aside) when Redis is unavailable on read, without throwing", async () => {
    mockGet.mockRejectedValue(new Error("ECONNREFUSED"));
    mockSet.mockRejectedValue(new Error("ECONNREFUSED"));
    const cache = new AlphaVantageCacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue({ price: "189.42" });

    await expect(cache.getOrSet("quote:IBM", 5000, fetcher)).resolves.toEqual({ price: "189.42" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("propagates a genuine fetcher error rather than swallowing it as a cache miss", async () => {
    mockGet.mockResolvedValue(null);
    const cache = new AlphaVantageCacheService(buildEnv());
    const fetcher = jest.fn().mockRejectedValue(new Error("Alpha Vantage is down"));

    await expect(cache.getOrSet("quote:IBM", 5000, fetcher)).rejects.toThrow("Alpha Vantage is down");
  });

  it("prefixes every key with alphavantage: so it can never collide with another cache user's keys", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const cache = new AlphaVantageCacheService(buildEnv());

    await cache.getOrSet("quote:IBM", 5000, async () => "v");

    expect(mockGet).toHaveBeenCalledWith("alphavantage:quote:IBM");
  });
});
