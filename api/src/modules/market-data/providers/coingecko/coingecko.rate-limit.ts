import { Injectable } from "@nestjs/common";
import type { ProviderRateLimitPolicy } from "../../interfaces/provider-rate-limit-policy.interface";
import { COINGECKO_DEFAULT_REQUESTS_PER_MINUTE } from "./coingecko.constants";

/**
 * Provider-specific rate limiter for CoinGecko — same sliding-window
 * design as `TwelveDataRateLimiter` (twelve-data.rate-limit.ts):
 * per-call timestamp eviction rather than a fixed 60s bucket reset, so
 * "never exceed API limits" (this module's standing rule since MD-001)
 * holds exactly, not approximately.
 */
@Injectable()
export class CoinGeckoRateLimiter implements ProviderRateLimitPolicy {
  private readonly callTimestamps: number[] = [];
  private static readonly WINDOW_MS = 60_000;

  constructor(public readonly requestsPerMinute: number = COINGECKO_DEFAULT_REQUESTS_PER_MINUTE) {}

  async getWaitTimeMs(): Promise<number> {
    this.evictExpired();
    if (this.callTimestamps.length < this.requestsPerMinute) return 0;
    const oldest = this.callTimestamps[0]!;
    return Math.max(0, oldest + CoinGeckoRateLimiter.WINDOW_MS - Date.now());
  }

  recordCall(): void {
    this.evictExpired();
    this.callTimestamps.push(Date.now());
  }

  private evictExpired(): void {
    const cutoff = Date.now() - CoinGeckoRateLimiter.WINDOW_MS;
    while (this.callTimestamps.length > 0 && this.callTimestamps[0]! < cutoff) {
      this.callTimestamps.shift();
    }
  }
}
