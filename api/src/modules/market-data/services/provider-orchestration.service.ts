import { Injectable, Logger } from "@nestjs/common";
import type { MarketDataProviderType } from "@rmsm/database";
import { ProviderRegistryService } from "../providers/provider-registry.service";
import type { MarketDataProvider } from "../interfaces/market-data-provider.interface";
import { MarketDataMetricsService } from "./market-data-metrics.service";
import { CircuitBreaker, CircuitState } from "./circuit-breaker";

export interface RetryOptions {
  maxRetries?: number;
  /** Base delay for exponential backoff between retries — doubled each attempt. This is in-process async retry within one service call, not a queued/scheduled job (explicitly excluded this phase). */
  baseBackoffMs?: number;
  /** Per-attempt timeout — Phase 5's "Timeout handling" deliverable, absent before this phase: a hanging provider call previously had no upper bound at all. */
  timeoutMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_BACKOFF_MS = 500;
const DEFAULT_TIMEOUT_MS = 10_000;
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 30_000;

/**
 * Centralizes provider-call retry, rate-limit policy, timeout, and
 * circuit-breaker application — every service that calls out to a
 * `MarketDataProvider` capability (HistoricalImportService today, any
 * future service) goes through here rather than reimplementing "wait
 * for the rate limit, retry on transient failure, don't hang forever,
 * don't keep hammering a provider that's clearly down" itself.
 * Provider-agnostic by construction: this class only ever calls
 * `provider.rateLimitPolicy`/`provider.errorMapper` — the same
 * interface every provider implements — never anything specific to one
 * provider type.
 */
@Injectable()
export class ProviderOrchestrationService {
  private readonly logger = new Logger(ProviderOrchestrationService.name);
  private readonly circuitBreakers = new Map<MarketDataProviderType, CircuitBreaker>();

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
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const circuit = this.getCircuitBreaker(providerType);

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      circuit.assertCanAttempt();

      const waitMs = await provider.rateLimitPolicy.getWaitTimeMs();
      if (waitMs > 0) {
        await this.sleep(waitMs);
      }

      try {
        const result = await this.withTimeout(operation(provider), timeoutMs, providerType);
        provider.rateLimitPolicy.recordCall();
        circuit.recordSuccess();
        if (attempt > 0) {
          this.metrics.increment(`provider.${providerType}.retry_succeeded`);
        }
        return result;
      } catch (error) {
        provider.rateLimitPolicy.recordCall();
        circuit.recordFailure();
        lastError = error;
        const classification = provider.errorMapper.classify(error);
        const isRetryable = provider.errorMapper.isRetryable(classification);

        this.metrics.increment(`provider.${providerType}.call_failed`);
        if (circuit.getState() === "open") {
          this.metrics.increment(`provider.${providerType}.circuit_opened`);
        }

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

  /** Exposed for the health/observability layer — MarketDataAdminService's Phase 5 health check reads this to report per-provider circuit state, not just import-job counts. */
  getCircuitState(providerType: MarketDataProviderType): CircuitState {
    return this.getCircuitBreaker(providerType).getState();
  }

  /**
   * FIP-001 Domain 1 "Provider failover" — tries each candidate in the
   * caller-supplied order (ProviderFailoverService sorts them by
   * MarketDataProviderConfig.priority before calling this), skipping any
   * whose circuit is currently open rather than wasting a call on a
   * provider already known to be failing. Throws the last real error
   * seen (not a generic "all providers failed" message) if every
   * candidate is exhausted, so the caller can still see what actually
   * went wrong with the last provider it tried.
   */
  async executeWithFailover<T>(
    candidateTypes: MarketDataProviderType[],
    operation: (provider: MarketDataProvider) => Promise<T>,
    options: RetryOptions = {},
  ): Promise<{ result: T; providerType: MarketDataProviderType }> {
    if (candidateTypes.length === 0) {
      throw new Error("executeWithFailover called with no candidate providers.");
    }
    let lastError: unknown;
    for (const providerType of candidateTypes) {
      if (this.getCircuitState(providerType) === "open") {
        this.logger.warn(`Skipping provider "${providerType}" in failover chain — circuit is open.`);
        continue;
      }
      try {
        const result = await this.executeWithRetry(providerType, operation, options);
        return { result, providerType };
      } catch (error) {
        lastError = error;
        this.metrics.increment(`provider.${providerType}.failover_attempted`);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`All ${candidateTypes.length} candidate provider(s) failed: ${candidateTypes.join(", ")}.`);
  }

  private getCircuitBreaker(providerType: MarketDataProviderType): CircuitBreaker {
    let breaker = this.circuitBreakers.get(providerType);
    if (!breaker) {
      breaker = new CircuitBreaker({ failureThreshold: CIRCUIT_FAILURE_THRESHOLD, cooldownMs: CIRCUIT_COOLDOWN_MS });
      this.circuitBreakers.set(providerType, breaker);
    }
    return breaker;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, providerType: MarketDataProviderType): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(`Provider "${providerType}" call exceeded ${timeoutMs}ms timeout.`)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timeoutHandle!);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
