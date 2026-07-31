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

// Imported after the mock so CoinGeckoCacheService's `new Redis(...)` resolves to the mock above.
import { CoinGeckoCacheService } from "../coingecko.cache";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
    REDIS_URL: "redis://localhost:6379",
    MARKET_DATA_CACHE_TTL_MS: 5000,
    ...overrides,
  } as Env;
}

describe("CoinGeckoCacheService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockOn.mockReset();
    mockDisconnect.mockReset();
  });

  it("calls fetcher and caches the result on a miss", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const cache = new CoinGeckoCacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue({ price: 65000 });

    const result = await cache.getOrSet("quote:bitcoin", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ price: 65000 });
    expect(mockSet).toHaveBeenCalledWith("coingecko:quote:bitcoin", JSON.stringify({ price: 65000 }), "PX", 5000);
  });

  it("returns the cached value and never calls fetcher on a hit", async () => {
    mockGet.mockResolvedValue(JSON.stringify({ price: 65000 }));
    const cache = new CoinGeckoCacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue({ price: 999999 });

    const result = await cache.getOrSet("quote:bitcoin", fetcher);

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({ price: 65000 });
  });

  it("respects MARKET_DATA_CACHE_TTL_MS from @rmsm/config rather than a hardcoded value", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const cache = new CoinGeckoCacheService(buildEnv({ MARKET_DATA_CACHE_TTL_MS: 42_000 }));

    await cache.getOrSet("k", async () => "v");

    expect(mockSet).toHaveBeenCalledWith("coingecko:k", JSON.stringify("v"), "PX", 42_000);
  });

  it("falls through to fetcher (cache-aside) when Redis is unavailable on read, without throwing", async () => {
    mockGet.mockRejectedValue(new Error("ECONNREFUSED"));
    mockSet.mockRejectedValue(new Error("ECONNREFUSED"));
    const cache = new CoinGeckoCacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue({ price: 65000 });

    const result = await expect(cache.getOrSet("quote:bitcoin", fetcher)).resolves.toEqual({ price: 65000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    return result;
  });

  it("propagates a genuine fetcher error rather than swallowing it as a cache miss", async () => {
    mockGet.mockResolvedValue(null);
    const cache = new CoinGeckoCacheService(buildEnv());
    const fetcher = jest.fn().mockRejectedValue(new Error("CoinGecko is down"));

    await expect(cache.getOrSet("quote:bitcoin", fetcher)).rejects.toThrow("CoinGecko is down");
  });

  it("prefixes every key with coingecko: so it can never collide with another cache user's keys", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const cache = new CoinGeckoCacheService(buildEnv());

    await cache.getOrSet("quote:bitcoin", async () => "v");

    expect(mockGet).toHaveBeenCalledWith("coingecko:quote:bitcoin");
  });
});
