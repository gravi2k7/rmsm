import type { RateLimitResult } from "../domain/entities/rate-limit-result.entity";

export interface RateLimiter {
  checkAndConsume(key: string): Promise<RateLimitResult>;
}
