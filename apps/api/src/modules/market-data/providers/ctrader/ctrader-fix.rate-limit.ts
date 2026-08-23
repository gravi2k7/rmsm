import { Injectable } from "@nestjs/common";
import type { ProviderRateLimitPolicy } from "../../interfaces/provider-rate-limit-policy.interface";

/**
 * cTrader FIX Price Connection is a persistent streaming session.
 *
 * Market-data quotes are pushed by the FIX server after subscription;
 * they are not obtained through per-request HTTP calls. Therefore RMSM
 * does not impose an HTTP-style requests-per-minute limiter here.
 *
 * The ProviderRateLimitPolicy contract is still implemented so the
 * provider conforms to the common market-data provider architecture.
 */
@Injectable()
export class CTraderFixRateLimiter implements ProviderRateLimitPolicy {
  readonly requestsPerMinute = Number.MAX_SAFE_INTEGER;

  async getWaitTimeMs(): Promise<number> {
    return 0;
  }

  recordCall(): void {
    // FIX market-data delivery is server-pushed; there is no
    // per-request client-side rate-limit window to record.
  }
}
