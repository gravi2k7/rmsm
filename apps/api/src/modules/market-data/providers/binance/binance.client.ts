import { Injectable, Logger } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import {
  BINANCE_DEFAULT_BASE_URL,
  BINANCE_DEFAULT_RETRY_COUNT,
  BINANCE_DEFAULT_RETRY_DELAY_MS,
  BINANCE_DEFAULT_TIMEOUT_MS,
  BINANCE_INTERVAL_MAP,
} from "./binance.constants";
import type {
  BinanceErrorResponse,
  BinanceExchangeInfoResponse,
  BinanceKline,
  BinanceTickerPrice,
} from "./binance.types";
import { BinanceRateLimiter } from "./binance.rate-limit";

export interface BinanceClientConfig {
  baseUrl: string;
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
}

export function toBinanceInterval(interval: CandleInterval): string {
  const mapped =
    BINANCE_INTERVAL_MAP[
      interval as keyof typeof BINANCE_INTERVAL_MAP
    ];

  if (!mapped) {
    throw new Error(
      `Binance does not support interval "${interval}" — supported: ${Object.keys(
        BINANCE_INTERVAL_MAP,
      ).join(", ")}.`,
    );
  }

  return mapped;
}

@Injectable()
export class BinanceClient {
  private readonly logger = new Logger(BinanceClient.name);

  constructor(
    private readonly config: BinanceClientConfig = {
      baseUrl: BINANCE_DEFAULT_BASE_URL,
      timeoutMs: BINANCE_DEFAULT_TIMEOUT_MS,
      retryCount: BINANCE_DEFAULT_RETRY_COUNT,
      retryDelayMs: BINANCE_DEFAULT_RETRY_DELAY_MS,
    },
    private readonly rateLimiter: BinanceRateLimiter = new BinanceRateLimiter(),
  ) {}

  async getKlines(params: {
    symbol: string;
    interval: CandleInterval;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<BinanceKline[]> {
    return this.request<BinanceKline[]>("/api/v3/klines", {
      symbol: params.symbol.toUpperCase(),
      interval: toBinanceInterval(params.interval),
      ...(params.startTime
        ? { startTime: String(params.startTime.getTime()) }
        : {}),
      ...(params.endTime
        ? { endTime: String(params.endTime.getTime()) }
        : {}),
      limit: String(Math.min(params.limit ?? 1000, 1000)),
    });
  }

  async getExchangeInfo(): Promise<BinanceExchangeInfoResponse> {
    return this.request<BinanceExchangeInfoResponse>(
      "/api/v3/exchangeInfo",
      {},
    );
  }

  async getTickerPrice(symbol: string): Promise<BinanceTickerPrice> {
    return this.request<BinanceTickerPrice>("/api/v3/ticker/price", {
      symbol: symbol.toUpperCase(),
    });
  }

  async ping(): Promise<void> {
    await this.request<Record<string, never>>("/api/v3/ping", {});
  }

  private async request<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const attempts = this.config.retryCount + 1;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const waitMs = await this.rateLimiter.getWaitTimeMs();

      if (waitMs > 0) {
        await this.sleep(waitMs);
      }

      try {
        this.rateLimiter.recordCall();

        const result = await this.fetchOnce<T>(path, params);

        this.logger.log({
          msg: "binance.response",
          path,
          attempt,
        });

        return result;
      } catch (error) {
        const retryable = this.isRetryable(error);

        if (attempt === attempts || !retryable) {
          throw error;
        }

        await this.sleep(
          this.config.retryDelayMs * 2 ** (attempt - 1),
        );
      }
    }

    throw new Error("Binance request failed.");
  }

  private async fetchOnce<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = new URL(
      path.replace(/^\/+/, ""),
      `${this.config.baseUrl.replace(/\/+$/, "")}/`,
    );

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs,
    );

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        signal: controller.signal,
      });

      const body = (await response.json()) as
        | T
        | BinanceErrorResponse;

      if (!response.ok) {
        const error = body as BinanceErrorResponse;

        throw {
          httpStatus: response.status,
          code: error.code,
          message: error.msg ?? `Binance HTTP ${response.status}`,
        };
      }

      return body as T;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw {
          isTimeout: true,
          message: `Binance request to ${path} exceeded ${this.config.timeoutMs}ms`,
        };
      }

      if (
        typeof error === "object" &&
        error !== null &&
        ("httpStatus" in error ||
          "isTimeout" in error ||
          "isNetworkFailure" in error)
      ) {
        throw error;
      }

      throw {
        isNetworkFailure: true,
        message:
          error instanceof Error
            ? error.message
            : "Unknown Binance network failure",
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private isRetryable(error: unknown): boolean {
    const err = error as {
      httpStatus?: number;
      isTimeout?: boolean;
      isNetworkFailure?: boolean;
    };

    return Boolean(
      err?.isTimeout ||
        err?.isNetworkFailure ||
        err?.httpStatus === 429 ||
        (typeof err?.httpStatus === "number" &&
          err.httpStatus >= 500),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
