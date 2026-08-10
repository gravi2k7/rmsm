import { Logger } from "@nestjs/common";
import { TwelveDataClient, toTwelveDataInterval, type TwelveDataClientConfig } from "../twelve-data.client";
import type { ProviderRateLimitPolicy } from "../../../interfaces/provider-rate-limit-policy.interface";

function buildConfig(overrides: Partial<TwelveDataClientConfig> = {}): TwelveDataClientConfig {
  return {
    apiKey: "super-secret-test-key",
    baseUrl: "https://api.twelvedata.com",
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

describe("toTwelveDataInterval", () => {
  it("maps every MD-001-required interval to Twelve Data's own string", () => {
    expect(toTwelveDataInterval("ONE_MINUTE")).toBe("1min");
    expect(toTwelveDataInterval("FIVE_MINUTES")).toBe("5min");
    expect(toTwelveDataInterval("FIFTEEN_MINUTES")).toBe("15min");
    expect(toTwelveDataInterval("THIRTY_MINUTES")).toBe("30min");
    expect(toTwelveDataInterval("ONE_HOUR")).toBe("1h");
    expect(toTwelveDataInterval("FOUR_HOURS")).toBe("4h");
    expect(toTwelveDataInterval("ONE_DAY")).toBe("1day");
  });

  it("throws for an interval MD-001 did not ask this provider to support", () => {
    expect(() => toTwelveDataInterval("ONE_WEEK")).toThrow(/does not support interval "ONE_WEEK"/);
    expect(() => toTwelveDataInterval("ONE_MONTH")).toThrow(/does not support interval/);
  });
});

describe("TwelveDataClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("issues a GET to /quote with the symbol as a query param and the API key attached", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { symbol: "AAPL", close: "150.00", status: "ok" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new TwelveDataClient(buildConfig(), noWaitRateLimiter() as never);
    await client.getQuote("AAPL");

    const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(calledUrl);
    expect(url.pathname).toBe("/quote");
    expect(url.searchParams.get("symbol")).toBe("AAPL");
    expect(url.searchParams.get("apikey")).toBe("super-secret-test-key");
  });

  it("never logs the API key on request or response log lines", async () => {
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { symbol: "AAPL", close: "150.00", status: "ok" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new TwelveDataClient(buildConfig({ apiKey: "sk-do-not-leak-me" }), noWaitRateLimiter() as never);
    await client.getQuote("AAPL");

    const allLoggedText = logSpy.mock.calls.map((call) => JSON.stringify(call)).join("\n");
    expect(allLoggedText).not.toContain("sk-do-not-leak-me");

    logSpy.mockRestore();
  });

  it("waits for the rate limiter before issuing a request, and records the call afterward", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { symbol: "AAPL", close: "150.00", status: "ok" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const rateLimiter: ProviderRateLimitPolicy = { getWaitTimeMs: jest.fn().mockResolvedValue(0), recordCall: jest.fn() };
    const client = new TwelveDataClient(buildConfig(), rateLimiter as never);
    await client.getQuote("AAPL");

    expect(rateLimiter.getWaitTimeMs).toHaveBeenCalled();
    expect(rateLimiter.recordCall).toHaveBeenCalled();
  });

  it("retries a 503 up to retryCount times, then succeeds", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { status: "error", code: 503, message: "temporarily unavailable" }))
      .mockResolvedValueOnce(jsonResponse(200, { symbol: "AAPL", close: "150.00", status: "ok" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new TwelveDataClient(buildConfig({ retryCount: 2 }), noWaitRateLimiter() as never);
    const result = await client.getQuote("AAPL");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.close).toBe("150.00");
  });

  it("does not retry a 401 — fails immediately with the classified error", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(401, { status: "error", code: 401, message: "invalid apikey" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new TwelveDataClient(buildConfig({ retryCount: 3 }), noWaitRateLimiter() as never);

    await expect(client.getQuote("AAPL")).rejects.toMatchObject({ httpStatus: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("exhausts retries on a persistent 500 and throws the last classified error", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(500, { status: "error", code: 500, message: "internal error" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new TwelveDataClient(buildConfig({ retryCount: 2 }), noWaitRateLimiter() as never);

    await expect(client.getQuote("AAPL")).rejects.toMatchObject({ httpStatus: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("classifies a request that exceeds the configured timeout as isTimeout", async () => {
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

    const client = new TwelveDataClient(buildConfig({ timeoutMs: 10, retryCount: 0 }), noWaitRateLimiter() as never);

    await expect(client.getQuote("AAPL")).rejects.toMatchObject({ isTimeout: true });
  });

  it("classifies a rejected fetch (no response at all) as isNetworkFailure", async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new TwelveDataClient(buildConfig({ retryCount: 0 }), noWaitRateLimiter() as never);

    await expect(client.getQuote("AAPL")).rejects.toMatchObject({ isNetworkFailure: true });
  });
});
