import { Injectable, Logger } from "@nestjs/common";

export interface RetryOptions {
  maxRetries: number;
  retryDelayMs: number;
  /** Only retry when this returns true — a permanent failure (e.g. invalid recipient) should fail fast, not burn through the retry budget. */
  isRetryable: (error: unknown) => boolean;
  /** Used only in log lines — never affects control flow. */
  operationName: string;
}

/**
 * EM-001's own Retry section: Exponential Backoff, Max Retry Count, Retry
 * Delay. A small, generic wrapper — not email-specific in its
 * mechanics — so `EmailQueueService` is the only caller that needs to
 * know about `EmailErrorMapper.isRetryable()`; this class just runs
 * whatever async operation it's given up to `maxRetries` additional
 * times, doubling `retryDelayMs` each attempt, exactly the same
 * exponential-backoff shape `MetaTrader5ConnectionManager`/
 * `MetaTrader5Client.request()` (BR-001) already established for this
 * codebase's other retry loops.
 */
@Injectable()
export class EmailRetryService {
  private readonly logger = new Logger(EmailRetryService.name);

  async executeWithRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
    const attempts = options.maxRetries + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;
        const isFinalAttempt = attempt === attempts;
        const retryable = options.isRetryable(err);
        this.logger.warn({ msg: "email.retry.attempt_failed", operation: options.operationName, attempt, of: attempts, retryable });
        if (isFinalAttempt || !retryable) throw err;
        await this.sleep(options.retryDelayMs * 2 ** (attempt - 1));
      }
    }
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
