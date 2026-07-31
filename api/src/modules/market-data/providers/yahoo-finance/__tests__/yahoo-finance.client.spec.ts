import { YahooFinanceClient, toYahooChartInterval, type YahooFinanceClientConfig } from "../yahoo-finance.client";
import type { ProviderRateLimitPolicy } from "../../../interfaces/provider-rate-limit-policy.interface";

function buildConfig(overrides: Partial<YahooFinanceClientConfig> = {}): YahooFinanceClientConfig {
  return {
    baseUrl: "https://query1.finance.yahoo.com",
    timeoutMs: 200,
    retryCount: 2,
    ...overrides,
  };
}

function noWaitRateLimiter(): ProviderRateLimitPolicy {
  return { getWaitTimeMs: jest.fn().mockResolvedValue(0), recordCall: jest.fn() };
}

function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: { get: (name: string) => extraHeaders[name.toLowerCase()] ?? null },
  };
}

function cookieResponse(cookie: string) {
  return { ok: true, status: 200, headers: { get: (name: string) => (name.toLowerCase() === "set-cookie" ? cookie : null) } };
}

function crumbTextResponse(crumb: string, ok = true, status = 200) {
  return { ok, status, text: () => Promise.resolve(crumb), headers: { get: () => null } };
}

describe("toYahooChartInterval", () => {
  it("resolves every supported interval", () => {
    expect(toYahooChartInterval("ONE_DAY")).toBe("1d");
    expect(toYahooChartInterval("ONE_WEEK")).toBe("1wk");
    expect(toYahooChartInterval("ONE_MONTH")).toBe("1mo");
  });

  it("throws a clear error for an unsupported interval (e.g. intraday)", () => {
    expect(() => toYahooChartInterval("ONE_MINUTE")).toThrow(/does not support interval "ONE_MINUTE"/);
  });
});

describe("YahooFinanceClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("getChart", () => {
    it("builds a /v8/finance/chart request with period1/period2 when an exact range is given, and needs no crumb", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { chart: { result: [{ meta: { symbol: "AAPL" } }] } }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig(), noWaitRateLimiter() as never);
      await client.getChart("AAPL", "ONE_DAY", { period1: 1000, period2: 2000 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const url = new URL(calledUrl);
      expect(url.pathname).toBe("/v8/finance/chart/AAPL");
      expect(url.searchParams.get("period1")).toBe("1000");
      expect(url.searchParams.get("period2")).toBe("2000");
      expect(url.searchParams.has("crumb")).toBe(false);
      expect((init.headers as Record<string, string>).Cookie).toBeUndefined();
    });

    it("falls back to the range shorthand when no period1/period2 is given", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { chart: { result: [{ meta: { symbol: "AAPL" } }] } }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig(), noWaitRateLimiter() as never);
      await client.getChart("AAPL", "ONE_DAY", { range: "5d" });

      const [calledUrl] = fetchMock.mock.calls[0] as [string];
      expect(new URL(calledUrl).searchParams.get("range")).toBe("5d");
    });

    it("includes events=div,split only when includeEvents is requested", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { chart: { result: [{ meta: { symbol: "AAPL" } }] } }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig(), noWaitRateLimiter() as never);
      await client.getChart("AAPL", "ONE_DAY", { includeEvents: true, range: "5y" });

      const [calledUrl] = fetchMock.mock.calls[0] as [string];
      expect(new URL(calledUrl).searchParams.get("events")).toBe("div,split");
    });

    it("throws isInvalidSymbol when chart.error is present on an otherwise-200 response", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { chart: { result: null, error: { code: "Not Found", description: "No data found" } } }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig({ retryCount: 0 }), noWaitRateLimiter() as never);

      await expect(client.getChart("ZZZZ", "ONE_DAY", { range: "5d" })).rejects.toMatchObject({ isInvalidSymbol: true });
    });
  });

  describe("getQuoteSummary (crumb-gated)", () => {
    it("negotiates a cookie + crumb before the first quoteSummary call, and sends both on the request", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(cookieResponse("B=abc123; path=/; domain=.yahoo.com"))
        .mockResolvedValueOnce(crumbTextResponse("my-crumb-value"))
        .mockResolvedValueOnce(jsonResponse(200, { quoteSummary: { result: [{ price: { symbol: "AAPL" } }] } }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig(), noWaitRateLimiter() as never);
      await client.getQuoteSummary("AAPL");

      expect(fetchMock).toHaveBeenCalledTimes(3);
      const [quoteSummaryUrl, quoteSummaryInit] = fetchMock.mock.calls[2] as [string, RequestInit];
      const url = new URL(quoteSummaryUrl);
      expect(url.pathname).toBe("/v10/finance/quoteSummary/AAPL");
      expect(url.searchParams.get("crumb")).toBe("my-crumb-value");
      expect((quoteSummaryInit.headers as Record<string, string>).Cookie).toBe("B=abc123");
    });

    it("reuses the cached crumb/cookie on a second call — no re-negotiation", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(cookieResponse("B=abc123"))
        .mockResolvedValueOnce(crumbTextResponse("my-crumb-value"))
        .mockResolvedValueOnce(jsonResponse(200, { quoteSummary: { result: [{ price: { symbol: "AAPL" } }] } }))
        .mockResolvedValueOnce(jsonResponse(200, { quoteSummary: { result: [{ price: { symbol: "AAPL" } }] } }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig(), noWaitRateLimiter() as never);
      await client.getQuoteSummary("AAPL");
      await client.getQuoteSummary("AAPL");

      // 2 negotiation calls + 2 quoteSummary calls, NOT 4 negotiation calls.
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it("clears the cached crumb after a 401 and re-negotiates on retry", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(cookieResponse("B=abc123"))
        .mockResolvedValueOnce(crumbTextResponse("stale-crumb"))
        .mockResolvedValueOnce(jsonResponse(401, { finance: { error: { code: "Unauthorized", description: "Invalid Crumb" } } }))
        .mockResolvedValueOnce(cookieResponse("B=def456"))
        .mockResolvedValueOnce(crumbTextResponse("fresh-crumb"))
        .mockResolvedValueOnce(jsonResponse(200, { quoteSummary: { result: [{ price: { symbol: "AAPL" } }] } }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig({ retryCount: 1 }), noWaitRateLimiter() as never);
      const result = await client.getQuoteSummary("AAPL");

      expect(fetchMock).toHaveBeenCalledTimes(6);
      expect(result).toEqual({ quoteSummary: { result: [{ price: { symbol: "AAPL" } }] } });
    });

    it("throws isProviderUnavailable when Yahoo returns no session cookie", async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => null } });
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig({ retryCount: 0 }), noWaitRateLimiter() as never);

      await expect(client.getQuoteSummary("AAPL")).rejects.toMatchObject({ isProviderUnavailable: true });
    });

    it("never logs the negotiated cookie or crumb", async () => {
      const { Logger } = await import("@nestjs/common");
      const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(cookieResponse("B=super-secret-cookie"))
        .mockResolvedValueOnce(crumbTextResponse("super-secret-crumb"))
        .mockResolvedValueOnce(jsonResponse(200, { quoteSummary: { result: [{ price: { symbol: "AAPL" } }] } }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig(), noWaitRateLimiter() as never);
      await client.getQuoteSummary("AAPL");

      const allLoggedText = logSpy.mock.calls.map((call) => JSON.stringify(call)).join("\n");
      expect(allLoggedText).not.toContain("super-secret-cookie");
      expect(allLoggedText).not.toContain("super-secret-crumb");
      logSpy.mockRestore();
    });
  });

  describe("search", () => {
    it("builds a /v1/finance/search request with no crumb required", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { quotes: [], news: [] }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig(), noWaitRateLimiter() as never);
      await client.search("apple");

      const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const url = new URL(calledUrl);
      expect(url.pathname).toBe("/v1/finance/search");
      expect(url.searchParams.get("q")).toBe("apple");
      expect((init.headers as Record<string, string>).Cookie).toBeUndefined();
    });
  });

  describe("resilience", () => {
    it("retries a 503 up to retryCount times, then succeeds", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(503, {}))
        .mockResolvedValueOnce(jsonResponse(200, { chart: { result: [{ meta: { symbol: "AAPL" } }] } }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig({ retryCount: 2 }), noWaitRateLimiter() as never);
      const result = await client.getChart("AAPL", "ONE_DAY", { range: "5d" });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ chart: { result: [{ meta: { symbol: "AAPL" } }] } });
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

      const client = new YahooFinanceClient(buildConfig({ timeoutMs: 10, retryCount: 0 }), noWaitRateLimiter() as never);

      await expect(client.getChart("AAPL", "ONE_DAY", { range: "5d" })).rejects.toMatchObject({ isTimeout: true });
    });

    it("classifies a rejected fetch (no response at all) as isNetworkError", async () => {
      const fetchMock = jest.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig({ retryCount: 0 }), noWaitRateLimiter() as never);

      await expect(client.getChart("AAPL", "ONE_DAY", { range: "5d" })).rejects.toMatchObject({ isNetworkError: true });
    });

    it("classifies a response body that isn't valid JSON as isParsingError", async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.reject(new Error("Unexpected token")), headers: { get: () => null } });
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig({ retryCount: 0 }), noWaitRateLimiter() as never);

      await expect(client.getChart("AAPL", "ONE_DAY", { range: "5d" })).rejects.toMatchObject({ isParsingError: true });
    });
  });

  describe("ping", () => {
    it("calls getChart for the documented health-check symbol", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { chart: { result: [{ meta: { symbol: "AAPL" } }] } }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new YahooFinanceClient(buildConfig(), noWaitRateLimiter() as never);
      await client.ping();

      const [calledUrl] = fetchMock.mock.calls[0] as [string];
      expect(new URL(calledUrl).pathname).toBe("/v8/finance/chart/AAPL");
    });
  });
});
