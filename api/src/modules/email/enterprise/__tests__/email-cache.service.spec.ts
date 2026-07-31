import type { Env } from "@rmsm/config";

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDel = jest.fn();
const mockOn = jest.fn();
const mockDisconnect = jest.fn();

jest.mock("ioredis", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ get: mockGet, set: mockSet, del: mockDel, on: mockOn, disconnect: mockDisconnect })),
}));

import { EmailCacheService } from "../cache/email-cache.service";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return { REDIS_URL: "redis://localhost:6379", ...overrides } as Env;
}

describe("EmailCacheService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockDel.mockReset();
    mockOn.mockReset();
    mockDisconnect.mockReset();
  });

  it("caches under the email: prefix on a miss", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const cache = new EmailCacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue({ subject: "Hi" });

    const result = await cache.getOrSet("template:welcome", 5000, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ subject: "Hi" });
    expect(mockSet).toHaveBeenCalledWith("email:template:welcome", JSON.stringify({ subject: "Hi" }), "PX", 5000);
  });

  it("returns a cached value without calling fetcher on a hit", async () => {
    mockGet.mockResolvedValue(JSON.stringify({ subject: "Hi" }));
    const cache = new EmailCacheService(buildEnv());
    const fetcher = jest.fn();

    const result = await cache.getOrSet("template:welcome", 5000, fetcher);

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({ subject: "Hi" });
  });

  it("degrades to a plain cache miss (never throws) when Redis is unavailable", async () => {
    mockGet.mockRejectedValue(new Error("ECONNREFUSED"));
    mockSet.mockRejectedValue(new Error("ECONNREFUSED"));
    const cache = new EmailCacheService(buildEnv());
    const fetcher = jest.fn().mockResolvedValue("v");

    await expect(cache.getOrSet("k", 1000, fetcher)).resolves.toBe("v");
  });

  it("invalidate() deletes the prefixed key", async () => {
    mockDel.mockResolvedValue(1);
    const cache = new EmailCacheService(buildEnv());

    await cache.invalidate("provider-config");

    expect(mockDel).toHaveBeenCalledWith("email:provider-config");
  });

  it("invalidate() never throws when Redis is unavailable", async () => {
    mockDel.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(new EmailCacheService(buildEnv()).invalidate("k")).resolves.toBeUndefined();
  });
});
