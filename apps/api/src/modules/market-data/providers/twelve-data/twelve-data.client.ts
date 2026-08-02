import { Injectable, Logger } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import { TwelveDataRateLimiter } from "./twelve-data.rate-limit";
import type { TwelveDataApiError } from "./twelve-data.error-mapper";

export interface TwelveDataClientConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
}

export interface TwelveDataCandleValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface TwelveDataTimeSeriesResponse {
  meta?: { symbol: string; interval: string; currency?: string; exchange_timezone?: string; exchange?: string; type?: string };
  values?: TwelveDataCandleValue[];
  status?: string;
  code?: number;
  message?: string;
}

export interface TwelveDataQuoteResponse {
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  datetime?: string;
  timestamp?: number;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  previous_close?: string;
  volume?: string;
  bid?: string;
  ask?: string;
  status?: string;
  code?: number;
  message?: string;
}

export interface TwelveDataSymbolSearchItem {
  symbol: string;
  instrument_name: string;
  exchange?: string;
  mic_code?: string;
  exchange_timezone?: string;
  instrument_type?: string;
  country?: string;
  currency?: string;
}

export interface TwelveDataSymbolSearchResponse {
  data?: TwelveDataSymbolSearchItem[];
  status?: string;
  code?: number;
  message?: string;
}

const TWELVE_DATA_INTERVAL_MAP: Partial<Record<CandleInterval, string>> = {
  ONE_MINUTE: "1min",
  FIVE_MINUTES: "5min",
  FIFTEEN_MINUTES: "15min",
  THIRTY_MINUTES: "30min",
  ONE_HOUR: "1h",
  FOUR_HOURS: "4h",
  ONE_DAY: "1day",
};

/**
 * MD-001's explicit supported-interval list — ONE_WEEK/ONE_MONTH are
 * deliberately absent (the prompt names exactly these 7: 1m/5m/15m/30m/
 * 1h/4h/1day). Throws for anything outside this map rather than silently
 * guessing an unsupported Twelve Data interval string that would fail
 * confusingly server-side instead of here, at the boundary.
 */
export function toTwelveDataInterval(interval: CandleInterval): string {
  const mapped = TWELVE_DATA_INTERVAL_MAP[interval];
  if (!mapped) {
    throw new Error(`Twelve Data provider does not support interval "${interval}" — supported: ${Object.keys(TWELVE_DATA_INTERVAL_MAP).join(", ")}.`);
  }
  return mapped;
}

/**
 * Raw HTTP transport for the Twelve Data REST API — no SDK dependency,
 * per this project's standing "no vendor SDK coupling" rule (Module
 * 002's OAuth providers, EP-004's Stripe/Razorpay/PayPal providers all
 * follow the same pattern: raw `fetch` only). Owns every cross-cutting
 * transport concern MD-001's HTTP Client section requires in one place:
 * timeout (AbortController), retry with exponential backoff,
 * provider-specific rate limiting (delegates the wait-before-call
 * decision to `TwelveDataRateLimiter` — this class never invents its own
 * policy, just obeys the injected one), and structured request/response
 * logging that never logs the API key (the key is appended to the query
 * string only inside `fetchOnce()`, after every log line for that
 * attempt has already been written).
 *
 * Returns Twelve Data's raw response shapes untouched (the
 * `TwelveData*Response` types above) — converting those into this
 * module's `NormalizedCandle`/`NormalizedQuote`/
 * `NormalizedSymbolSearchResult` models is deliberately NOT this class's
 * job; see `twelve-data.mapper.ts`. Keeping the two separate is what
 * makes "never expose provider response objects outside provider"
 * (MD-001's explicit rule) enforceable — nothing outside this directory
 * ever imports these raw response types.
 */
@Injectable()
export class TwelveDataClient {
  private readonly logger = new Logger(TwelveDataClient.name);

  constructor(
    private readonly config: TwelveDataClientConfig,
    private readonly rateLimiter: TwelveDataRateLimiter,
  ) {}

  async getTimeSeries(params: { symbol: string; interval: CandleInterval; startDate?: Date; endDate?: Date; outputsize?: number }): Promise<TwelveDataTimeSeriesResponse> {
    return this.request<TwelveDataTimeSeriesResponse>("/time_series", {
      symbol: params.symbol,
      interval: toTwelveDataInterval(params.interval),
      ...(params.startDate ? { start_date: this.toApiDate(params.startDate) } : {}),
      ...(params.endDate ? { end_date: this.toApiDate(params.endDate) } : {}),
      ...(params.outputsize ? { outputsize: String(params.outputsize) } : {}),
    });
  }

  async getQuote(symbol: string): Promise<TwelveDataQuoteResponse> {
    return this.request<TwelveDataQuoteResponse>("/quote", { symbol });
  }

  async getSymbolSearch(query: string, limit?: number): Promise<TwelveDataSymbolSearchResponse> {
    return this.request<TwelveDataSymbolSearchResponse>("/symbol_search", {
      symbol: query,
      ...(limit ? { outputsize: String(limit) } : {}),
    });
  }

  /** Lightweight, minimal-cost call used only by `TwelveDataHealthProvider`
   * — `/quote` for a highly liquid, virtually always-listed symbol is the
   * cheapest genuinely-representative "is the API up and is our key
   * valid" probe Twelve Data's REST surface offers; it publishes no
   * dedicated `/ping` or `/status` endpoint. */
  async ping(): Promise<void> {
    await this.getQuote("AAPL");
  }

  private toApiDate(date: Date): string {
    return date.toISOString().slice(0, 19).replace("T", " ");
  }

  private async request<T extends { status?: string; code?: number; message?: string }>(path: string, params: Record<string, string>): Promise<T> {
    const attempts = this.config.retryCount + 1;
    let lastError: TwelveDataApiError = { isNetworkFailure: true, message: "Twelve Data request never attempted" };

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const waitMs = await this.rateLimiter.getWaitTimeMs();
      if (waitMs > 0) {
        this.logger.log({ msg: "twelve_data.rate_limit.wait", path, waitMs, attempt });
        await this.sleep(waitMs);
      }

      const startedAt = Date.now();
      // `params` never contains `apikey` at this point — it is appended
      // only inside fetchOnce(), so this log line can never leak it.
      this.logger.log({ msg: "twelve_data.request", path, params, attempt, of: attempts });

      try {
        this.rateLimiter.recordCall();
        const result = await this.fetchOnce<T>(path, params);
        const latencyMs = Date.now() - startedAt;

        if (result.status === "error") {
          const apiError: TwelveDataApiError = { httpStatus: result.code, message: result.message };
          lastError = apiError;
          this.logger.warn({ msg: "twelve_data.response.error", path, latencyMs, attempt, httpStatus: result.code, message: result.message });
          if (!this.isRetryableStatus(result.code) || attempt === attempts) {
            throw apiError;
          }
          await this.backoff(attempt);
          continue;
        }

        this.logger.log({ msg: "twelve_data.response", path, latencyMs, attempt });
        return result;
      } catch (err) {
        const classified = this.classifyThrown(err);
        lastError = classified;
        this.logger.warn({
          msg: "twelve_data.request.failed",
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
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set("apikey", this.config.apiKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(url.toString(), { method: "GET", signal: controller.signal });
      const body = (await res.json()) as T;
      if (!res.ok) {
        const apiError: TwelveDataApiError = { httpStatus: res.status, message: this.extractMessage(body) };
        throw apiError;
      }
      return body;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        const timeoutError: TwelveDataApiError = { isTimeout: true, message: `Twelve Data request to ${path} exceeded ${this.config.timeoutMs}ms` };
        throw timeoutError;
      }
      if (this.isTwelveDataApiError(err)) throw err;
      const networkError: TwelveDataApiError = { isNetworkFailure: true, message: err instanceof Error ? err.message : "Unknown network failure" };
      throw networkError;
    } finally {
      clearTimeout(timer);
    }
  }

  private isTwelveDataApiError(err: unknown): err is TwelveDataApiError {
    return typeof err === "object" && err !== null && ("httpStatus" in err || "isTimeout" in err || "isNetworkFailure" in err);
  }

  private classifyThrown(err: unknown): TwelveDataApiError {
    if (this.isTwelveDataApiError(err)) return err;
    return { isNetworkFailure: true, message: err instanceof Error ? err.message : "Unknown error" };
  }

  private extractMessage(body: unknown): string | undefined {
    if (typeof body === "object" && body !== null && "message" in body && typeof (body as { message: unknown }).message === "string") {
      return (body as { message: string }).message;
    }
    return undefined;
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
