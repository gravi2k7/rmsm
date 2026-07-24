import { Injectable } from "@nestjs/common";
import { AiGatewayConfigService } from "../config/ai-gateway-config.service";
import { RateLimitExceededError } from "../errors/ai-gateway.errors";

/**
 * A real, working token-bucket rate limiter — in-memory, one bucket
 * per organization (falling back to a single global bucket when no
 * organization context is available), reset on process restart. The
 * same honestly-scoped "real but single-instance" category as
 * AI-101's own `CircuitBreaker`
 * (`market-data/services/circuit-breaker.ts`, reused directly by
 * `ai-provider-resilience.service.ts` rather than duplicated) — a
 * genuinely multi-instance-safe limiter would need shared state
 * (Redis, which this phase's own "Redis Usage" deliverable names as
 * available platform infrastructure but which this specific limiter
 * doesn't use yet) so two running API instances don't each allow the
 * full quota independently. Named as a real, structural limitation.
 */
@Injectable()
export class AiRateLimiterService {
  private readonly buckets = new Map<string, { tokens: number; lastRefillAt: number }>();

  constructor(private readonly config: AiGatewayConfigService) {}

  /** Throws RateLimitExceededError if the caller (scoped by organizationId, or "global" when absent) has exhausted its own per-minute quota; otherwise consumes one token. */
  consume(scopeKey: string = "global"): void {
    const limit = this.config.rateLimitPerMinute;
    const now = Date.now();
    const bucket = this.buckets.get(scopeKey) ?? { tokens: limit, lastRefillAt: now };

    const elapsedMs = now - bucket.lastRefillAt;
    const refillTokens = (elapsedMs / 60000) * limit;
    bucket.tokens = Math.min(limit, bucket.tokens + refillTokens);
    bucket.lastRefillAt = now;

    if (bucket.tokens < 1) {
      this.buckets.set(scopeKey, bucket);
      throw new RateLimitExceededError(limit);
    }

    bucket.tokens -= 1;
    this.buckets.set(scopeKey, bucket);
  }

  remaining(scopeKey: string = "global"): number {
    const bucket = this.buckets.get(scopeKey);
    return bucket ? Math.floor(bucket.tokens) : this.config.rateLimitPerMinute;
  }
}
