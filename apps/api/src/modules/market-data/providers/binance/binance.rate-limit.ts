import { Injectable } from "@nestjs/common";
import type { ProviderRateLimitPolicy } from "../../interfaces/provider-rate-limit-policy.interface";
import { BINANCE_DEFAULT_REQUESTS_PER_MINUTE } from "./binance.constants";

@Injectable()
export class BinanceRateLimiter implements ProviderRateLimitPolicy {
  private readonly callTimestamps: number[] = [];
  private static readonly WINDOW_MS = 60_000;

  constructor(
    public readonly requestsPerMinute: number =
      BINANCE_DEFAULT_REQUESTS_PER_MINUTE,
  ) {}

  async getWaitTimeMs(): Promise<number> {
    this.evictExpired();

    if (this.callTimestamps.length < this.requestsPerMinute) {
      return 0;
    }

    const oldest = this.callTimestamps[0];
    if (oldest === undefined) return 0;

    return Math.max(
      0,
      oldest + BinanceRateLimiter.WINDOW_MS - Date.now(),
    );
  }

  recordCall(): void {
    this.evictExpired();
    this.callTimestamps.push(Date.now());
  }

  private evictExpired(): void {
    const cutoff = Date.now() - BinanceRateLimiter.WINDOW_MS;

    while (this.callTimestamps.length > 0) {
      const oldest = this.callTimestamps[0];

      if (oldest === undefined || oldest >= cutoff) break;

      this.callTimestamps.shift();
    }
  }
}
