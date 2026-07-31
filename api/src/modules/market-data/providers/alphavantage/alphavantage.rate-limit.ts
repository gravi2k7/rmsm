import { Injectable } from "@nestjs/common";
import type { ProviderRateLimitPolicy } from "../../interfaces/provider-rate-limit-policy.interface";
import { ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_MINUTE, ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY } from "./alphavantage.constants";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;

/**
 * Alpha Vantage's free tier enforces TWO independent caps — 5/minute AND
 * a much stricter 25/day — unlike every other provider in this module,
 * where a single per-minute sliding window was sufficient. This class
 * tracks both with the same per-call-timestamp sliding-window eviction
 * pattern `TwelveDataRateLimiter`/`CoinGeckoRateLimiter` already use
 * (one instance each, since they expire on different horizons), and
 * `getWaitTimeMs()` returns whichever of the two waits is longer — the
 * daily cap will almost always be the binding constraint in practice
 * (25/day means an organization exhausts it in under 5 minutes of
 * steady per-minute-limit use), which is exactly why MD-003 calling out
 * "respect Alpha Vantage free-tier limits" specifically matters here.
 */
@Injectable()
export class AlphaVantageRateLimiter implements ProviderRateLimitPolicy {
  private readonly minuteTimestamps: number[] = [];
  private readonly dayTimestamps: number[] = [];

  constructor(
    public readonly requestsPerMinute: number = ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_MINUTE,
    public readonly requestsPerDay: number = ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY,
  ) {}

  async getWaitTimeMs(): Promise<number> {
    const minuteWait = this.waitFor(this.minuteTimestamps, this.requestsPerMinute, MINUTE_MS);
    const dayWait = this.waitFor(this.dayTimestamps, this.requestsPerDay, DAY_MS);
    return Math.max(minuteWait, dayWait);
  }

  recordCall(): void {
    const now = Date.now();
    this.evict(this.minuteTimestamps, MINUTE_MS);
    this.evict(this.dayTimestamps, DAY_MS);
    this.minuteTimestamps.push(now);
    this.dayTimestamps.push(now);
  }

  private waitFor(timestamps: number[], limit: number, windowMs: number): number {
    this.evict(timestamps, windowMs);
    if (timestamps.length < limit) return 0;
    return Math.max(0, timestamps[0] + windowMs - Date.now());
  }

  private evict(timestamps: number[], windowMs: number): void {
    const cutoff = Date.now() - windowMs;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }
  }
}
