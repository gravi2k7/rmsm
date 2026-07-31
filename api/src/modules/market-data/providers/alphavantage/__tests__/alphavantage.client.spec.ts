import { Logger } from "@nestjs/common";
import { AlphaVantageClient, toAlphaVantageRequest, type AlphaVantageClientConfig } from "../alphavantage.client";
import type { ProviderRateLimitPolicy } from "../../../interfaces/provider-rate-limit-policy.interface";

function buildConfig(overrides: Partial<AlphaVantageClientConfig> = {}): AlphaVantageClientConfig {
  return {
    apiKey: "super-secret-av-key",
    baseUrl: "https://www.alphavantage.co",
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

describe("toAlphaVantageRequest", () => {
  it("resolves every supported interval to its function/interval/seriesKey", () => {
    expect(toAlphaVantageRequest("ONE_DAY")).toEqual({ fn: "TIME_SERIES_DAILY", seriesKey: "Time Series (Daily)" });
    expect(toAlphaVantageRequest("ONE_MINUTE")).toEqual({ fn: "TIME_SERIES_INTRADAY", interval: "1min", seriesKey: "Time Series (1min)" });
  });

  it("throws a clear, descriptive error for FOUR_HOURS rather than approximating it", () => {
    expect(() => toAlphaVantageRequest("FOUR_HOURS")).toThrow(/does not support interval "FOUR_HOURS"/);
  });
});

describe("AlphaVantageClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("sends the API key only as the apikey query parameter, appended after params are built", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { "Global Quote": { "01. symbol": "IBM" } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig({ apiKey: "sk-do-not-leak" }), noWaitRateLimiter() as never);
    await client.getGlobalQuote("IBM");

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(new URL(calledUrl).searchParams.get("apikey")).toBe("sk-do-not-leak");
  });

  it("falls back to the documented 'demo' key when none is configured", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { "Global Quote": { "01. symbol": "IBM" } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig({ apiKey: undefined }), noWaitRateLimiter() as never);
    await client.getGlobalQuote("IBM");

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(new URL(calledUrl).searchParams.get("apikey")).toBe("demo");
  });

  it("never logs the API key on request, response, or failure log lines", async () => {
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { "Global Quote": { "01. symbol": "IBM" } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig({ apiKey: "sk-do-not-leak-either" }), noWaitRateLimiter() as never);
    await client.getGlobalQuote("IBM");

    const allLoggedText = [...logSpy.mock.calls, ...warnSpy.mock.calls].map((call) => JSON.stringify(call)).join("\n");
    expect(allLoggedText).not.toContain("sk-do-not-leak-either");
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("getGlobalQuote builds a GLOBAL_QUOTE request with the given symbol", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { "Global Quote": { "01. symbol": "IBM" } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig(), noWaitRateLimiter() as never);
    await client.getGlobalQuote("IBM");

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    const url = new URL(calledUrl);
    expect(url.pathname).toBe("/query");
    expect(url.searchParams.get("function")).toBe("GLOBAL_QUOTE");
    expect(url.searchParams.get("symbol")).toBe("IBM");
  });

  it("getTimeSeries resolves the interval and passes the interval param only for intraday functions", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { "Time Series (Daily)": {} }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig(), noWaitRateLimiter() as never);
    await client.getTimeSeries("IBM", "ONE_DAY");

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    const url = new URL(calledUrl);
    expect(url.searchParams.get("function")).toBe("TIME_SERIES_DAILY");
    expect(url.searchParams.has("interval")).toBe(false);
  });

  it("getExchangeRate builds a CURRENCY_EXCHANGE_RATE request with from_currency/to_currency", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { "Realtime Currency Exchange Rate": {} }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig(), noWaitRateLimiter() as never);
    await client.getExchangeRate("EUR", "USD");

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    const url = new URL(calledUrl);
    expect(url.searchParams.get("function")).toBe("CURRENCY_EXCHANGE_RATE");
    expect(url.searchParams.get("from_currency")).toBe("EUR");
    expect(url.searchParams.get("to_currency")).toBe("USD");
  });

  it("treats a Note-flagged body as a retryable rate-limit error and retries", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { Note: "Thank you for using Alpha Vantage! Our standard API rate limit is..." }))
      .mockResolvedValueOnce(jsonResponse(200, { "Global Quote": { "01. symbol": "IBM" } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig({ retryCount: 1, retryDelayMs: 1 }), noWaitRateLimiter() as never);
    const result = await client.getGlobalQuote("IBM");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ "Global Quote": { "01. symbol": "IBM" } });
  });

  it("HTTP 200 with an Information message about the apikey throws isInformationMessage (not silently treated as success)", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { Information: "The **apikey** provided is invalid." }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig({ retryCount: 0 }), noWaitRateLimiter() as never);

    await expect(client.getGlobalQuote("IBM")).rejects.toMatchObject({ isInformationMessage: true });
  });

  it("HTTP 200 with an 'Error Message' body (invalid function/params) throws isErrorMessage and is not retried", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { "Error Message": "Invalid API call." }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig({ retryCount: 3 }), noWaitRateLimiter() as never);

    await expect(client.getGlobalQuote("IBM")).rejects.toMatchObject({ isErrorMessage: true, message: "Invalid API call." });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a 503 up to retryCount times, then succeeds", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { "Error Message": "temporarily unavailable" }))
      .mockResolvedValueOnce(jsonResponse(200, { "Global Quote": { "01. symbol": "IBM" } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig({ retryCount: 2 }), noWaitRateLimiter() as never);
    const result = await client.getGlobalQuote("IBM");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ "Global Quote": { "01. symbol": "IBM" } });
  });

  it("does not retry a 401 — fails immediately with the classified error", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(401, { "Error Message": "invalid key" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig({ retryCount: 3 }), noWaitRateLimiter() as never);

    await expect(client.getGlobalQuote("IBM")).rejects.toMatchObject({ httpStatus: 401 });
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

    const client = new AlphaVantageClient(buildConfig({ timeoutMs: 10, retryCount: 0 }), noWaitRateLimiter() as never);

    await expect(client.getGlobalQuote("IBM")).rejects.toMatchObject({ isTimeout: true });
  });

  it("classifies a rejected fetch (no response at all) as isNetworkFailure", async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig({ retryCount: 0 }), noWaitRateLimiter() as never);

    await expect(client.getGlobalQuote("IBM")).rejects.toMatchObject({ isNetworkFailure: true });
  });

  it("classifies a response body that isn't valid JSON as isMalformedResponse", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.reject(new Error("Unexpected token")) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig({ retryCount: 0 }), noWaitRateLimiter() as never);

    await expect(client.getGlobalQuote("IBM")).rejects.toMatchObject({ isMalformedResponse: true });
  });

  it("ping() calls GLOBAL_QUOTE for the documented health-check symbol", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { "Global Quote": { "01. symbol": "IBM" } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new AlphaVantageClient(buildConfig(), noWaitRateLimiter() as never);
    await client.ping();

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    const url = new URL(calledUrl);
    expect(url.searchParams.get("function")).toBe("GLOBAL_QUOTE");
    expect(url.searchParams.get("symbol")).toBe("IBM");
  });

  it("waits on the rate limiter before each attempt", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { "Global Quote": { "01. symbol": "IBM" } }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const rateLimiter = { getWaitTimeMs: jest.fn().mockResolvedValue(0), recordCall: jest.fn() };

    const client = new AlphaVantageClient(buildConfig(), rateLimiter as never);
    await client.getGlobalQuote("IBM");

    expect(rateLimiter.getWaitTimeMs).toHaveBeenCalled();
    expect(rateLimiter.recordCall).toHaveBeenCalled();
  });
});
