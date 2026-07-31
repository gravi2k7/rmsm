import { Injectable } from "@nestjs/common";
import type { ProviderRateLimitPolicy } from "../../interfaces/provider-rate-limit-policy.interface";
import { YAHOO_DEFAULT_REQUESTS_PER_MINUTE } from "./yahoo-finance.constants";

const MINUTE_MS = 60_000;

/**
 * Single 60s sliding window, same per-call-timestamp eviction pattern as
 * `TwelveDataRateLimiter`/`CoinGeckoRateLimiter` — Yahoo publishes no
 * official rate limit (no official API at all) so, unlike Alpha
 * Vantage's genuine dual daily/minute cap, there is only one
 * self-imposed ceiling to enforce here (see
 * `YAHOO_DEFAULT_REQUESTS_PER_MINUTE`'s own doc comment).
 */
@Injectable()
export class YahooFinanceRateLimiter implements ProviderRateLimitPolicy {
  private readonly timestamps: number[] = [];

  constructor(public readonly requestsPerMinute: number = YAHOO_DEFAULT_REQUESTS_PER_MINUTE) {}

  async getWaitTimeMs(): Promise<number> {
    this.evict();
    if (this.timestamps.length < this.requestsPerMinute) return 0;
    return Math.max(0, this.timestamps[0] + MINUTE_MS - Date.now());
  }

  recordCall(): void {
    this.evict();
    this.timestamps.push(Date.now());
  }

  private evict(): void {
    const cutoff = Date.now() - MINUTE_MS;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }
}
