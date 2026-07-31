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

// Imported after the mock so YahooFinanceCacheService's `new Redis(...)` resolves to the mock above.
import { YahooFinanceCacheService } from "../yahoo-finance.cache";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
    REDIS_URL: "redis://localhost:6379",
    ...overrides,
  } as Env;
}

describe("YahooFinanceCacheService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockOn.mockReset();
    mockDisconnect.mockReset();
  });

  it("calls fetcher and caches the result at the caller-supplied ttlMs on a miss", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const cache = new YahooFinanceCacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue({ sector: "TECHNOLOGY" });

    const result = await cache.getOrSet("profile:AAPL", 7_200_000, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ sector: "TECHNOLOGY" });
    expect(mockSet).toHaveBeenCalledWith("yahoo:profile:AAPL", JSON.stringify({ sector: "TECHNOLOGY" }), "PX", 7_200_000);
  });

  it("returns the cached value and never calls fetcher on a hit", async () => {
    mockGet.mockResolvedValue(JSON.stringify({ sector: "TECHNOLOGY" }));
    const cache = new YahooFinanceCacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue({ sector: "HEALTHCARE" });

    const result = await cache.getOrSet("profile:AAPL", 7_200_000, fetcher);

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({ sector: "TECHNOLOGY" });
  });

  it("honors a different ttlMs per call", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const cache = new YahooFinanceCacheService(buildEnv());

    await cache.getOrSet("quote:AAPL", 300_000, async () => "quote");
    await cache.getOrSet("profile:AAPL", 7_200_000, async () => "profile");

    expect(mockSet).toHaveBeenNthCalledWith(1, "yahoo:quote:AAPL", JSON.stringify("quote"), "PX", 300_000);
    expect(mockSet).toHaveBeenNthCalledWith(2, "yahoo:profile:AAPL", JSON.stringify("profile"), "PX", 7_200_000);
  });

  it("falls through to fetcher (cache-aside) when Redis is unavailable on read, without throwing", async () => {
    mockGet.mockRejectedValue(new Error("ECONNREFUSED"));
    mockSet.mockRejectedValue(new Error("ECONNREFUSED"));
    const cache = new YahooFinanceCacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue({ sector: "TECHNOLOGY" });

    await expect(cache.getOrSet("profile:AAPL", 7_200_000, fetcher)).resolves.toEqual({ sector: "TECHNOLOGY" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("propagates a genuine fetcher error rather than swallowing it as a cache miss", async () => {
    mockGet.mockResolvedValue(null);
    const cache = new YahooFinanceCacheService(buildEnv());
    const fetcher = jest.fn().mockRejectedValue(new Error("Yahoo Finance is down"));

    await expect(cache.getOrSet("profile:AAPL", 7_200_000, fetcher)).rejects.toThrow("Yahoo Finance is down");
  });

  it("prefixes every key with yahoo: so it can never collide with another cache user's keys", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const cache = new YahooFinanceCacheService(buildEnv());

    await cache.getOrSet("profile:AAPL", 7_200_000, async () => "v");

    expect(mockGet).toHaveBeenCalledWith("yahoo:profile:AAPL");
  });
});
