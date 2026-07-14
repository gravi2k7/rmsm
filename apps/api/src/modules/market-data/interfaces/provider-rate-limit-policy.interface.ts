/**
 * A provider-specific rate-limiting strategy — distinct from Module 001's
 * ThrottlerModule (which protects THIS API's own endpoints from abuse).
 * This contract protects THIS SYSTEM from exceeding an external
 * provider's own rate limits when calling out to them, the opposite
 * direction of concern.
 */
export interface ProviderRateLimitPolicy {
  /** Returns milliseconds to wait before the next call is safe, or 0 if a call can proceed immediately. */
  getWaitTimeMs(): Promise<number>;
  /** Records that a call was just made, so subsequent getWaitTimeMs() calls account for it. */
  recordCall(): void;
}
