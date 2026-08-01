import { Injectable, Logger } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import { YahooFinanceRateLimiter } from "./yahoo-finance.rate-limit";
import type { YahooFinanceApiError } from "./yahoo-finance.error-mapper";
import { YAHOO_CHART_INTERVAL, YAHOO_QUOTE_SUMMARY_MODULES, YAHOO_HEALTH_CHECK_SYMBOL, YAHOO_DEFAULT_RETRY_DELAY_MS } from "./yahoo-finance.constants";
import type { YahooChartResponse, YahooQuoteSummaryResponse, YahooSearchResponse } from "./yahoo-finance.types";

export interface YahooFinanceClientConfig {
  baseUrl: string;
  timeoutMs: number;
  retryCount: number;
}

/** Resolves the Yahoo `/v8/finance/chart` interval string for a given `CandleInterval`. Yahoo's chart endpoint supports far more granularities than this — only the three MD-004 names (Daily/Weekly/Monthly) are implemented; anything else throws a clear, descriptive error before any network call. */
export function toYahooChartInterval(interval: CandleInterval): string {
  const resolved = YAHOO_CHART_INTERVAL[interval];
  if (!resolved) {
    throw new Error(`Yahoo Finance provider does not support interval "${interval}" — supported: ${Object.keys(YAHOO_CHART_INTERVAL).join(", ")}.`);
  }
  return resolved;
}

/**
 * Raw HTTP transport for Yahoo Finance's unofficial `query1`/`query2`
 * endpoints — no SDK dependency, same standing rule as every provider
 * since MD-001. Owns timeout, retry with exponential backoff,
 * rate-limiter integration, and structured logging that never logs the
 * session cookie or crumb (Yahoo's unofficial-auth equivalent of an API
 * key — see `ensureCrumb()`).
 *
 * Two endpoint families, deliberately different auth requirements:
 * `/v8/finance/chart` and `/v1/finance/search` need no authentication at
 * all; `/v10/finance/quoteSummary` requires a session cookie + "crumb"
 * token obtained via a two-step handshake (`ensureCrumb()`). This
 * crumb/cookie flow is the single most fragile part of Yahoo's
 * unofficial surface — it is well documented (by every open-source
 * Yahoo client, e.g. yfinance) to occasionally require re-issuing
 * mid-session; a 401/403 from quoteSummary clears the cached crumb and
 * is retried once with a freshly negotiated one before giving up.
 */
@Injectable()
export class YahooFinanceClient {
  private readonly logger = new Logger(YahooFinanceClient.name);
  private cookie: string | undefined;
  private crumb: string | undefined;

  constructor(
    private readonly config: YahooFinanceClientConfig,
    private readonly rateLimiter: YahooFinanceRateLimiter,
  ) {}

  /**
   * `period1`/`period2` (Unix seconds) are preferred whenever the caller
   * has an exact date range — matches `HistoricalDataRequest.from/to`
   * precisely, unlike Yahoo's coarser `range` shorthand (`"1y"`, `"5d"`,
   * etc.), which is used only as a fallback for calls with no specific
   * range in mind (dividend/split history, the health-check ping).
   */
  async getChart(
    symbol: string,
    interval: CandleInterval,
    options: { includeEvents?: boolean; period1?: number; period2?: number; range?: string } = {},
  ): Promise<YahooChartResponse> {
    const yahooInterval = toYahooChartInterval(interval);
    const params = new URLSearchParams({ interval: yahooInterval });
    if (options.period1 !== undefined && options.period2 !== undefined) {
      params.set("period1", String(options.period1));
      params.set("period2", String(options.period2));
    } else {
      params.set("range", options.range ?? "1y");
    }
    if (options.includeEvents) params.set("events", "div,split");
    return this.request<YahooChartResponse>(`/v8/finance/chart/${encodeURIComponent(symbol)}?${params.toString()}`, { requiresCrumb: false });
  }

  async getQuoteSummary(symbol: string): Promise<YahooQuoteSummaryResponse> {
    return this.request<YahooQuoteSummaryResponse>(`/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${YAHOO_QUOTE_SUMMARY_MODULES}`, {
      requiresCrumb: true,
    });
  }

  async search(query: string): Promise<YahooSearchResponse> {
    const params = new URLSearchParams({ q: query, newsCount: "10", quotesCount: "10" });
    return this.request<YahooSearchResponse>(`/v1/finance/search?${params.toString()}`, { requiresCrumb: false });
  }

  /** Used only by `YahooFinanceHealthProvider` — the cheapest genuinely-representative probe available, same reasoning as every other provider's `ping()`. */
  async ping(): Promise<void> {
    await this.getChart(YAHOO_HEALTH_CHECK_SYMBOL, "ONE_DAY", { range: "5d" });
  }

  private async request<T>(path: string, options: { requiresCrumb: boolean }): Promise<T> {
    const attempts = this.config.retryCount + 1;
    let lastError: YahooFinanceApiError = { isNetworkError: true, message: "Yahoo Finance request never attempted" };

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const waitMs = await this.rateLimiter.getWaitTimeMs();
      if (waitMs > 0) {
        this.logger.log({ msg: "yahoo.rate_limit.wait", path, waitMs, attempt });
        await this.sleep(waitMs);
      }

      const startedAt = Date.now();
      this.logger.log({ msg: "yahoo.request", path, requiresCrumb: options.requiresCrumb, attempt, of: attempts });

      try {
        this.rateLimiter.recordCall();
        const result = await this.fetchOnce<T>(path, options.requiresCrumb, attempt);
        this.logger.log({ msg: "yahoo.response", path, latencyMs: Date.now() - startedAt, attempt });
        return result;
      } catch (err) {
        const classified = this.classifyThrown(err);
        lastError = classified;

        // A 401/403 on a crumb-requiring call likely means the cached
        // crumb/cookie went stale mid-session — clear it so the next
        // attempt negotiates a fresh one, rather than retrying with the
        // same (still-invalid) credentials.
        const isStaleCrumb = options.requiresCrumb && (classified.httpStatus === 401 || classified.httpStatus === 403);
        if (isStaleCrumb) {
          this.cookie = undefined;
          this.crumb = undefined;
        }

        this.logger.warn({
          msg: "yahoo.request.failed",
          path,
          attempt,
          of: attempts,
          isTimeout: classified.isTimeout ?? false,
          isNetworkError: classified.isNetworkError ?? false,
          httpStatus: classified.httpStatus,
        });

        const isFinalAttempt = attempt === attempts;
        // A stale-crumb 401/403 is retryable exactly once (with a freshly
        // negotiated crumb) even though 401/403 is not retryable in
        // general — the crumb-clearing above is what makes the retry
        // meaningfully different from the failed attempt, unlike a
        // genuine auth failure on a non-crumb endpoint.
        const retryable = Boolean(classified.isTimeout) || Boolean(classified.isNetworkError) || Boolean(classified.isProviderUnavailable) || this.isRetryableStatus(classified.httpStatus) || isStaleCrumb;
        if (isFinalAttempt || !retryable) {
          throw classified;
        }
        await this.backoff(attempt);
      }
    }

    throw lastError;
  }

  private async fetchOnce<T>(path: string, requiresCrumb: boolean, attempt: number): Promise<T> {
    let url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0 (compatible; RMSM-MarketData/1.0)" };

    if (requiresCrumb) {
      const { cookie, crumb } = await this.ensureCrumb(attempt);
      headers.Cookie = cookie;
      url += `${path.includes("?") ? "&" : "?"}crumb=${encodeURIComponent(crumb)}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(url, { method: "GET", headers, signal: controller.signal });

      let body: unknown;
      try {
        body = await res.json();
      } catch {
        const parsingError: YahooFinanceApiError = { isParsingError: true, message: "Response body was not valid JSON" };
        throw parsingError;
      }

      if (!res.ok) {
        const apiError: YahooFinanceApiError = { httpStatus: res.status, message: `Yahoo Finance returned HTTP ${res.status}` };
        throw apiError;
      }
      if (typeof body !== "object" || body === null) {
        const unexpectedError: YahooFinanceApiError = { isUnexpectedResponse: true, message: "Response body was not a JSON object" };
        throw unexpectedError;
      }

      this.checkEnvelope(body as Record<string, unknown>);
      return body as T;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        const timeoutError: YahooFinanceApiError = { isTimeout: true, message: `Yahoo Finance request exceeded ${this.config.timeoutMs}ms` };
        throw timeoutError;
      }
      if (this.isYahooFinanceApiError(err)) throw err;
      const networkError: YahooFinanceApiError = { isNetworkError: true, message: err instanceof Error ? err.message : "Unknown network failure" };
      throw networkError;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Both `chart` and `quoteSummary` carry their own inline `error` object on an otherwise-200 response for an unrecognized symbol — inspected here so a bad symbol is classified as `isInvalidSymbol` rather than silently returned as an empty/malformed success. */
  private checkEnvelope(body: Record<string, unknown>): void {
    const chart = body.chart as { error?: { description?: string } | null } | undefined;
    if (chart?.error) {
      const invalidSymbolError: YahooFinanceApiError = { isInvalidSymbol: true, message: chart.error.description ?? "Unknown symbol" };
      throw invalidSymbolError;
    }
    const quoteSummary = body.quoteSummary as { error?: { description?: string } | null; result?: unknown[] | null } | undefined;
    if (quoteSummary?.error) {
      const invalidSymbolError: YahooFinanceApiError = { isInvalidSymbol: true, message: quoteSummary.error.description ?? "Unknown symbol" };
      throw invalidSymbolError;
    }
  }

  /** Negotiates Yahoo's unofficial session cookie + crumb, caching both in memory for reuse across calls. Re-negotiated automatically after a 401/403 clears the cache (see `request()`), or on the very first crumb-requiring call. Never logged — treated with the same discipline as every other provider's API key. */
  private async ensureCrumb(attempt: number): Promise<{ cookie: string; crumb: string }> {
    if (this.cookie && this.crumb) return { cookie: this.cookie, crumb: this.crumb };

    this.logger.log({ msg: "yahoo.crumb.negotiating", attempt });

    const cookieRes = await fetch("https://fc.yahoo.com", { method: "GET", redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (compatible; RMSM-MarketData/1.0)" } });
    const setCookie = cookieRes.headers.get("set-cookie");
    if (!setCookie) {
      const unavailableError: YahooFinanceApiError = { isProviderUnavailable: true, message: "Yahoo Finance did not return a session cookie" };
      throw unavailableError;
    }
    // String.prototype.split always returns at least one element, so index 0 always
    // exists here — noUncheckedIndexedAccess just can't infer that from the split() signature.
    const cookie = setCookie.split(";")[0]!;

    const crumbRes = await fetch(`${this.config.baseUrl}/v1/test/getcrumb`, { headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0 (compatible; RMSM-MarketData/1.0)" } });
    if (!crumbRes.ok) {
      const unavailableError: YahooFinanceApiError = { isProviderUnavailable: true, httpStatus: crumbRes.status, message: "Failed to obtain a Yahoo Finance crumb" };
      throw unavailableError;
    }
    const crumb = await crumbRes.text();
    if (!crumb) {
      const unavailableError: YahooFinanceApiError = { isProviderUnavailable: true, message: "Yahoo Finance returned an empty crumb" };
      throw unavailableError;
    }

    this.cookie = cookie;
    this.crumb = crumb;
    return { cookie, crumb };
  }

  private isYahooFinanceApiError(err: unknown): err is YahooFinanceApiError {
    return (
      typeof err === "object" &&
      err !== null &&
      ("httpStatus" in err ||
        "isNetworkError" in err ||
        "isTimeout" in err ||
        "isInvalidSymbol" in err ||
        "isParsingError" in err ||
        "isProviderUnavailable" in err ||
        "isUnexpectedResponse" in err)
    );
  }

  private classifyThrown(err: unknown): YahooFinanceApiError {
    if (this.isYahooFinanceApiError(err)) return err;
    return { isNetworkError: true, message: err instanceof Error ? err.message : "Unknown error" };
  }

  private isRetryableStatus(status?: number): boolean {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  private async backoff(attempt: number): Promise<void> {
    await this.sleep(YAHOO_DEFAULT_RETRY_DELAY_MS * 2 ** (attempt - 1));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
