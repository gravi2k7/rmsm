import type { Clock } from "@rmsm/core";
import type { RateLimiter } from "../repositories/rate-limiter.interface";
import type { RateLimitResult } from "../domain/entities/rate-limit-result.entity";

interface Window {
  count: number;
  windowStart: number;
}

/** The one real `RateLimiter`: a fixed-window counter per key. Every
 * `windowMs` milliseconds the count for a key resets; at most `limit`
 * calls are allowed to pass within one window. Deterministic and
 * entirely driven by the injected `Clock` — no timers, no external
 * rate-limiting service. */
export class FixedWindowRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly clock: Clock,
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  async checkAndConsume(key: string): Promise<RateLimitResult> {
    const now = this.clock.now().getTime();
    let window = this.windows.get(key);

    if (!window || now - window.windowStart >= this.windowMs) {
      window = { count: 0, windowStart: now };
      this.windows.set(key, window);
    }

    const resetAt = new Date(window.windowStart + this.windowMs);
    if (window.count >= this.limit) {
      return { allowed: false, remaining: 0, resetAt };
    }

    window.count += 1;
    return { allowed: true, remaining: Math.max(0, this.limit - window.count), resetAt };
  }
}
