import { Logger } from "@nestjs/common";
import { CoinGeckoClient, resolveOhlcDays, type CoinGeckoClientConfig } from "../coingecko.client";
import type { ProviderRateLimitPolicy } from "../../../interfaces/provider-rate-limit-policy.interface";

function buildConfig(overrides: Partial<CoinGeckoClientConfig> = {}): CoinGeckoClientConfig {
  return {
    apiKey: "super-secret-demo-key",
    baseUrl: "https://api.coingecko.com/api/v3",
    timeoutMs: 200,
    retryCount: 2,
    retryDelayMs: 1,
    ...overrides,
  };
}

function noWaitRateLimiter(): ProviderRateLimitPolicy {
  return { getWaitTimeMs: jest.fn().mockResolvedValue(0), recordCall: jest.fn() };
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

describe("resolveOhlcDays", () => {
  const from = new Date("2026-01-01T00:00:00Z");

  it("resolves THIRTY_MINUTES to days=1 regardless of requested range", () => {
    expect(resolveOhlcDays("THIRTY_MINUTES", from, new Date("2026-01-01T12:00:00Z"))).toBe(1);
    expect(resolveOhlcDays("THIRTY_MINUTES", from, new Date("2026-01-05T00:00:00Z"))).toBe(1);
  });

  it("resolves FOUR_HOURS to the requested span, clamped to CoinGecko's [2, 30] day tier", () => {
    expect(resolveOhlcDays("FOUR_HOURS", from, new Date("2026-01-02T00:00:00Z"))).toBe(2);
    expect(resolveOhlcDays("FOUR_HOURS", from, new Date("2026-01-11T00:00:00Z"))).toBe(10);
    expect(resolveOhlcDays("FOUR_HOURS", from, new Date("2026-06-01T00:00:00Z"))).toBe(30);
  });

  it("throws for any interval outside the two CoinGecko OHLC supports honestly", () => {
    expect(() => resolveOhlcDays("ONE_DAY", from, new Date("2026-01-02T00:00:00Z"))).toThrow(/no corresponding CoinGecko granularity tier/);
    expect(() => resolveOhlcDays("ONE_HOUR", from, new Date("2026-01-02T00:00:00Z"))).toThrow();
  });
});

describe("CoinGeckoClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("sends the API key as the x-cg-demo-api-key header, never as a query parameter", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, [{ id: "bitcoin" }]));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new CoinGeckoClient(buildConfig({ apiKey: "sk-do-not-leak" }), noWaitRateLimiter() as never);
    await client.getMarkets(["bitcoin"]);

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).not.toContain("sk-do-not-leak");
    expect((init.headers as Record<string, string>)["x-cg-demo-api-key"]).toBe("sk-do-not-leak");
  });

  it("omits the auth header entirely when no API key is configured (CoinGecko's public tier works without one)", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, [{ id: "bitcoin" }]));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new CoinGeckoClient(buildConfig({ apiKey: undefined }), noWaitRateLimiter() as never);
    await client.getMarkets(["bitcoin"]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({});
  });

  it("never logs the API key on request or response log lines", async () => {
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, [{ id: "bitcoin" }]));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new CoinGeckoClient(buildConfig({ apiKey: "sk-do-not-leak-either" }), noWaitRateLimiter() as never);
    await client.getMarkets(["bitcoin"]);

    const allLoggedText = logSpy.mock.calls.map((call) => JSON.stringify(call)).join("\n");
    expect(allLoggedText).not.toContain("sk-do-not-leak-either");
    logSpy.mockRestore();
  });

  it("getMarkets builds a /coins/markets request with vs_currency=usd and comma-joined ids", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, []));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new CoinGeckoClient(buildConfig(), noWaitRateLimiter() as never);
    await client.getMarkets(["bitcoin", "ethereum"]);

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    const url = new URL(calledUrl);
    expect(url.pathname).toBe("/coins/markets");
    expect(url.searchParams.get("vs_currency")).toBe("usd");
    expect(url.searchParams.get("ids")).toBe("bitcoin,ethereum");
  });

  it("getOhlc builds a /coins/{id}/ohlc request with the resolved days param", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, []));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new CoinGeckoClient(buildConfig(), noWaitRateLimiter() as never);
    await client.getOhlc("bitcoin", 7);

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    const url = new URL(calledUrl);
    expect(url.pathname).toBe("/coins/bitcoin/ohlc");
    expect(url.searchParams.get("days")).toBe("7");
  });

  it("retries a 503 up to retryCount times, then succeeds", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: "temporarily unavailable" }))
      .mockResolvedValueOnce(jsonResponse(200, [{ id: "bitcoin" }]));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new CoinGeckoClient(buildConfig({ retryCount: 2 }), noWaitRateLimiter() as never);
    const result = await client.getMarkets(["bitcoin"]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ id: "bitcoin" }]);
  });

  it("does not retry a 401 — fails immediately with the classified error", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(401, { status: { error_code: 401, error_message: "invalid key" } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new CoinGeckoClient(buildConfig({ retryCount: 3 }), noWaitRateLimiter() as never);

    await expect(client.getMarkets(["bitcoin"])).rejects.toMatchObject({ httpStatus: 401, message: "invalid key" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("classifies a request exceeding the configured timeout as isTimeout", async () => {
    const fetchMock = jest.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new CoinGeckoClient(buildConfig({ timeoutMs: 10, retryCount: 0 }), noWaitRateLimiter() as never);

    await expect(client.getMarkets(["bitcoin"])).rejects.toMatchObject({ isTimeout: true });
  });

  it("classifies a rejected fetch (no response at all) as isNetworkFailure", async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new CoinGeckoClient(buildConfig({ retryCount: 0 }), noWaitRateLimiter() as never);

    await expect(client.getMarkets(["bitcoin"])).rejects.toMatchObject({ isNetworkFailure: true });
  });

  it("ping() calls the dedicated /ping endpoint", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { gecko_says: "(V3) To the Moon!" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new CoinGeckoClient(buildConfig(), noWaitRateLimiter() as never);
    await client.ping();

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(new URL(calledUrl).pathname).toBe("/ping");
  });
});
