import { Injectable, Logger } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import { CoinGeckoRateLimiter } from "./coingecko.rate-limit";
import type { CoinGeckoApiError } from "./coingecko.error-mapper";
import type { CoinGeckoMarketsEntry, CoinGeckoOhlcEntry, CoinGeckoSearchResponse, CoinGeckoErrorBody } from "./coingecko.types";

export interface CoinGeckoClientConfig {
  apiKey: string | undefined;
  baseUrl: string;
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
}

/**
 * CoinGecko's `/coins/{id}/ohlc` endpoint auto-selects candle granularity
 * from the `days` request parameter — it does not accept an independent
 * interval choice the way Twelve Data's `/time_series` does. Per
 * CoinGecko's own documented behavior: `days=1` returns 30-minute
 * candles, `days` in [2, 30] returns 4-hour candles, and `days` beyond
 * 30 returns 4-day candles. RMSM's `CandleInterval` enum has no
 * "FOUR_DAYS" member, so the 31+ day tier has no representable value
 * this provider could honestly label its output with — `resolveOhlcDays()`
 * only ever returns a `days` value from the two supported tiers, and
 * `fetchCandles()` in coingecko.provider.ts rejects any requested
 * interval outside {THIRTY_MINUTES, FOUR_HOURS} before ever calling this
 * client, rather than silently mislabeling coarser data as something
 * finer-grained than it actually is.
 */
export function resolveOhlcDays(interval: CandleInterval, from: Date, to: Date): number {
  const spanDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));

  if (interval === "THIRTY_MINUTES") return 1;
  if (interval === "FOUR_HOURS") return Math.min(30, Math.max(2, spanDays));

  throw new Error(
    `CoinGecko OHLC only supports THIRTY_MINUTES (days=1) or FOUR_HOURS (days 2-30) — "${interval}" has no corresponding CoinGecko granularity tier.`,
  );
}

/**
 * Raw HTTP transport for CoinGecko's public REST API — no SDK dependency,
 * same "raw fetch only" rule this module has followed since MD-001.
 * Owns timeout (`AbortController`), retry with exponential backoff,
 * provider-specific rate limiting (delegates to `CoinGeckoRateLimiter`,
 * never invents its own policy), and structured logging that never logs
 * the API key — the key travels as the `x-cg-demo-api-key` HTTP header,
 * never a query parameter, so it can never end up in a logged URL the
 * way a query-param key could.
 *
 * Returns CoinGecko's raw response shapes untouched
 * (`coingecko.types.ts`) — converting those into this module's
 * Normalized (and rich-market-snapshot) models is `coingecko.mapper.ts`'s
 * job, not this one's, matching `TwelveDataClient`'s exact split.
 */
@Injectable()
export class CoinGeckoClient {
  private readonly logger = new Logger(CoinGeckoClient.name);

  constructor(
    private readonly config: CoinGeckoClientConfig,
    private readonly rateLimiter: CoinGeckoRateLimiter,
  ) {}

  /** `GET /coins/markets` — the single call this provider uses for
   * current price, market cap, 24h volume/change, high/low, and supply
   * (see coingecko.types.ts's doc comment on why this endpoint over
   * `/simple/price`). Accepts multiple ids in one call. */
  async getMarkets(ids: string[]): Promise<CoinGeckoMarketsEntry[]> {
    const result = await this.request<CoinGeckoMarketsEntry[]>("/coins/markets", {
      vs_currency: "usd",
      ids: ids.join(","),
      price_change_percentage: "24h",
    });
    return result;
  }

  /** `GET /coins/{id}/ohlc` — see `resolveOhlcDays()`'s doc comment for
   * the days/granularity relationship this endpoint imposes. */
  async getOhlc(id: string, days: number): Promise<CoinGeckoOhlcEntry[]> {
    return this.request<CoinGeckoOhlcEntry[]>(`/coins/${encodeURIComponent(id)}/ohlc`, {
      vs_currency: "usd",
      days: String(days),
    });
  }

  /** `GET /search` — returns coins/exchanges/categories; this provider only reads `.coins`. */
  async search(query: string): Promise<CoinGeckoSearchResponse> {
    return this.request<CoinGeckoSearchResponse>("/search", { query });
  }

  /** CoinGecko publishes a dedicated `/ping` endpoint (unlike Twelve
   * Data) — the cheapest possible "is the API reachable" probe, used
   * only by `CoinGeckoHealthProvider`. */
  async ping(): Promise<void> {
    await this.request<{ gecko_says?: string }>("/ping", {});
  }

  private async request<T>(path: string, params: Record<string, string>): Promise<T> {
    const attempts = this.config.retryCount + 1;
    let lastError: CoinGeckoApiError = { isNetworkFailure: true, message: "CoinGecko request never attempted" };

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const waitMs = await this.rateLimiter.getWaitTimeMs();
      if (waitMs > 0) {
        this.logger.log({ msg: "coingecko.rate_limit.wait", path, waitMs, attempt });
        await this.sleep(waitMs);
      }

      const startedAt = Date.now();
      // `params` never contains the API key — it travels as a header,
      // attached only inside fetchOnce(), so this log line can't leak it.
      this.logger.log({ msg: "coingecko.request", path, params, attempt, of: attempts });

      try {
        this.rateLimiter.recordCall();
        const result = await this.fetchOnce<T>(path, params);
        this.logger.log({ msg: "coingecko.response", path, latencyMs: Date.now() - startedAt, attempt });
        return result;
      } catch (err) {
        const classified = this.classifyThrown(err);
        lastError = classified;
        this.logger.warn({
          msg: "coingecko.request.failed",
          path,
          attempt,
          of: attempts,
          isTimeout: classified.isTimeout ?? false,
          isNetworkFailure: classified.isNetworkFailure ?? false,
          httpStatus: classified.httpStatus,
        });

        const isFinalAttempt = attempt === attempts;
        const retryable = Boolean(classified.isTimeout) || Boolean(classified.isNetworkFailure) || this.isRetryableStatus(classified.httpStatus);
        if (isFinalAttempt || !retryable) {
          throw classified;
        }
        await this.backoff(attempt);
      }
    }

    throw lastError;
  }

  private async fetchOnce<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(path, this.config.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value.length > 0) url.searchParams.set(key, value);
    }

    const headers: Record<string, string> = {};
    if (this.config.apiKey) headers["x-cg-demo-api-key"] = this.config.apiKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(url.toString(), { method: "GET", headers, signal: controller.signal });
      const body = (await res.json()) as T | CoinGeckoErrorBody;

      if (!res.ok) {
        const apiError: CoinGeckoApiError = { httpStatus: res.status, message: this.extractMessage(body) };
        throw apiError;
      }
      return body as T;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        const timeoutError: CoinGeckoApiError = { isTimeout: true, message: `CoinGecko request to ${path} exceeded ${this.config.timeoutMs}ms` };
        throw timeoutError;
      }
      if (this.isCoinGeckoApiError(err)) throw err;
      const networkError: CoinGeckoApiError = { isNetworkFailure: true, message: err instanceof Error ? err.message : "Unknown network failure" };
      throw networkError;
    } finally {
      clearTimeout(timer);
    }
  }

  private isCoinGeckoApiError(err: unknown): err is CoinGeckoApiError {
    return (
      typeof err === "object" &&
      err !== null &&
      ("httpStatus" in err || "isTimeout" in err || "isNetworkFailure" in err || "isUnknownSymbol" in err)
    );
  }

  private classifyThrown(err: unknown): CoinGeckoApiError {
    if (this.isCoinGeckoApiError(err)) return err;
    return { isNetworkFailure: true, message: err instanceof Error ? err.message : "Unknown error" };
  }

  private extractMessage(body: unknown): string | undefined {
    if (typeof body !== "object" || body === null) return undefined;
    const errorBody = body as CoinGeckoErrorBody;
    return errorBody.status?.error_message ?? errorBody.error;
  }

  private isRetryableStatus(status?: number): boolean {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  private async backoff(attempt: number): Promise<void> {
    await this.sleep(this.config.retryDelayMs * 2 ** (attempt - 1));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
