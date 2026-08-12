import { Injectable } from "@nestjs/common";
import type { ProviderRateLimitPolicy } from "../../interfaces/provider-rate-limit-policy.interface";

/**
 * Twelve Data's own documented "Basic" (free) plan ceiling — 8 API
 * credits per minute. A `MarketDataProviderConfig` row's
 * `rateLimitPerMinute` overrides this for an organization on a paid plan
 * (see `TwelveDataRegistrarService.buildProvider()` in
 * twelve-data.module.ts); this constant is only the fallback when no
 * config row is supplied, matching the eagerly-registered instance the
 * Registry holds.
 */
export const TWELVE_DATA_DEFAULT_REQUESTS_PER_MINUTE = 8;

const WINDOW_MS = 60_000;

/**
 * Provider-specific rate limiter — distinct from Module 001's
 * ThrottlerModule per ProviderRateLimitPolicy's own doc comment (this
 * protects Twelve Data's limits from us, not this API's endpoints from
 * abuse). Sliding window: every call's timestamp is recorded, and each
 * check evicts timestamps older than 60 seconds before comparing the
 * remaining count against the limit — a fixed-bucket reset every 60s
 * would let a burst just before a minute boundary be followed
 * immediately by a second burst just after it; the sliding window is
 * what makes "never exceed API limits" (MD-001's explicit requirement)
 * actually true rather than approximately true.
 */
@Injectable()
export class TwelveDataRateLimiter implements ProviderRateLimitPolicy {
  private readonly callTimestamps: number[] = [];

  constructor(public readonly requestsPerMinute: number = TWELVE_DATA_DEFAULT_REQUESTS_PER_MINUTE) {}

  async getWaitTimeMs(): Promise<number> {
    this.evictExpired();
    if (this.callTimestamps.length < this.requestsPerMinute) return 0;
    const oldest = this.callTimestamps[0]!;
    return Math.max(0, oldest + WINDOW_MS - Date.now());
  }

  recordCall(): void {
    this.evictExpired();
    this.callTimestamps.push(Date.now());
  }

  private evictExpired(): void {
    const cutoff = Date.now() - WINDOW_MS;
    while (this.callTimestamps.length > 0 && this.callTimestamps[0]! < cutoff) {
      this.callTimestamps.shift();
    }
  }
}
