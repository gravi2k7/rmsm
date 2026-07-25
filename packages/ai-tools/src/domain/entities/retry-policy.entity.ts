export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly backoffMs?: number;
}
