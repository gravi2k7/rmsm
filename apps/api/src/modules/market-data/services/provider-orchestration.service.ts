import { Injectable, Logger } from "@nestjs/common";
import type { MarketDataProviderType } from "@rmsm/database";
import { ProviderRegistryService } from "../providers/provider-registry.service";
import type { MarketDataProvider } from "../interfaces/market-data-provider.interface";
import { MarketDataMetricsService } from "./market-data-metrics.service";

export interface RetryOptions {
  maxRetries?: number;
  /** Base delay for exponential backoff between retries — doubled each attempt. This is in-process async retry within one service call, not a queued/scheduled job (explicitly excluded this phase). */
  baseBackoffMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_BACKOFF_MS = 500;

/**
 * Centralizes provider-call retry and rate-limit policy application —
 * every service that calls out to a `MarketDataProvider` capability
 * (HistoricalImportService today, any future service) goes through here
 * rather than reimplementing "wait for the rate limit, retry on
 * transient failure" itself. Provider-agnostic by construction: this
 * class only ever calls `provider.rateLimitPolicy`/`provider.errorMapper`
 * — the same interface every provider implements — never anything
 * specific to one provider type (the architecture rule carried forward
 * from Phase 2B: "Provider Registry remains provider-agnostic... applies
 * to the service layer too").
 */
@Injectable()
export class ProviderOrchestrationService {
  private readonly logger = new Logger(ProviderOrchestrationService.name);

  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly metrics: MarketDataMetricsService,
  ) {}

  async executeWithRetry<T>(
    providerType: MarketDataProviderType,
    operation: (provider: MarketDataProvider) => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const provider = this.registry.get(providerType);
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const waitMs = await provider.rateLimitPolicy.getWaitTimeMs();
      if (waitMs > 0) {
        await this.sleep(waitMs);
      }

      try {
        const result = await operation(provider);
        provider.rateLimitPolicy.recordCall();
        if (attempt > 0) {
          this.metrics.increment(`provider.${providerType}.retry_succeeded`);
        }
        return result;
      } catch (error) {
        provider.rateLimitPolicy.recordCall();
        lastError = error;
        const classification = provider.errorMapper.classify(error);
        const isRetryable = provider.errorMapper.isRetryable(classification);

        this.metrics.increment(`provider.${providerType}.call_failed`);

        if (!isRetryable || attempt === maxRetries) {
          this.logger.warn(
            `Provider "${providerType}" call failed${isRetryable ? " (retries exhausted)" : " (not retryable)"}: ${error instanceof Error ? error.message : String(error)}`,
          );
          throw error;
        }

        this.metrics.increment(`provider.${providerType}.retry_attempted`);
        this.logger.warn(`Provider "${providerType}" call failed (attempt ${attempt + 1}/${maxRetries + 1}, classification=${classification}), retrying: ${error instanceof Error ? error.message : String(error)}`);
        await this.sleep(baseBackoffMs * 2 ** attempt);
      }
    }

    // Unreachable in practice (the loop always returns or throws), but
    // TypeScript can't prove that — an explicit throw here is honest
    // about the loop's actual exit conditions rather than asserting a
    // return type the loop body doesn't structurally guarantee.
    throw lastError instanceof Error ? lastError : new Error(`Provider "${providerType}" call failed after ${maxRetries + 1} attempts.`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
