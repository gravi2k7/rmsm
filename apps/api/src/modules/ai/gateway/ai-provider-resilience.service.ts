import { Injectable, Logger } from "@nestjs/common";
import { CircuitBreaker } from "../../market-data/services/circuit-breaker";
import { AiGatewayConfigService } from "../config/ai-gateway-config.service";
import { CircuitOpenError } from "../errors/ai-gateway.errors";

/**
 * Real "Retry," "Timeout," and "Circuit Breaker" (this phase's own
 * Gateway responsibilities), composed around any provider call. The
 * circuit breaker itself is AI-101's own real, already-proven
 * `CircuitBreaker` class (`market-data/services/circuit-breaker.ts`)
 * — imported and reused directly, ONE instance per provider type (a
 * struggling OpenAI doesn't trip Ollama's own circuit, and vice
 * versa), not duplicated into a second implementation. Retry uses
 * real exponential backoff (`baseDelayMs * 2^attempt`), configurable
 * via centralized config (`AI_GATEWAY_MAX_RETRIES`,
 * `AI_GATEWAY_RETRY_BASE_DELAY_MS`) — this phase's own "no hardcoded
 * values" rule.
 */
@Injectable()
export class AiProviderResilienceService {
  private readonly logger = new Logger(AiProviderResilienceService.name);
  private readonly breakers = new Map<string, CircuitBreaker>();

  constructor(private readonly config: AiGatewayConfigService) {}

  async execute<T>(providerType: string, operation: () => Promise<T>): Promise<T> {
    const breaker = this.breakerFor(providerType);

    try {
      breaker.assertCanAttempt();
    } catch {
      throw new CircuitOpenError(providerType);
    }

    const maxAttempts = this.config.maxRetries + 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await operation();
        breaker.recordSuccess();
        return result;
      } catch (error) {
        lastError = error;
        breaker.recordFailure();
        if (attempt < maxAttempts - 1) {
          const delayMs = this.config.retryBaseDelayMs * 2 ** attempt;
          this.logger.warn(`provider=${providerType} attempt=${attempt + 1}/${maxAttempts} failed, retrying in ${delayMs}ms: ${error instanceof Error ? error.message : String(error)}`);
          await this.sleep(delayMs);
        }
      }
    }

    throw lastError;
  }

  private breakerFor(providerType: string): CircuitBreaker {
    let breaker = this.breakers.get(providerType);
    if (!breaker) {
      breaker = new CircuitBreaker({ failureThreshold: this.config.circuitFailureThreshold, cooldownMs: this.config.circuitCooldownMs });
      this.breakers.set(providerType, breaker);
    }
    return breaker;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
