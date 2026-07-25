/** The "rate limiting hooks" capability's result shape — returned by
 * every `RateLimiter.checkAndConsume` call so a caller (here,
 * `ExecutionSandboxService`) can see not just pass/fail but how much
 * budget remains and when it resets. */
export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: Date;
}
