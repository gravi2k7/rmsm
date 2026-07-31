import { Injectable, Logger } from "@nestjs/common";
import type { HealthProvider, ProviderHealthSnapshot } from "../../interfaces/health-provider.interface";
import type { ProviderOutageClassification } from "../../contracts/workflow.contracts";
import type { ProviderErrorClassification } from "../../interfaces/provider-error-mapper.interface";
import { YahooFinanceClient } from "./yahoo-finance.client";
import { YahooFinanceErrorMapper } from "./yahoo-finance.error-mapper";

/**
 * MD-004's required health states — "Provider Reachable / Response Valid
 * / Provider Healthy" — map onto the existing `ProviderOutageClassification`
 * vocabulary (`"healthy" | "degraded" | "down" | "unknown"`) the same way
 * every other provider's health check does: a successful `ping()` means
 * reachable + valid + healthy in one step (Yahoo's chart endpoint either
 * returns a well-formed body or it doesn't — there is no separate
 * "reachable but invalid" state to distinguish). Never throws — a failed
 * probe is reported AS a snapshot, not an exception.
 */
@Injectable()
export class YahooFinanceHealthProvider implements HealthProvider {
  private readonly logger = new Logger(YahooFinanceHealthProvider.name);
  private lastSuccessfulRequestAt: Date | null = null;
  private consecutiveFailureCount = 0;

  constructor(
    private readonly client: YahooFinanceClient,
    private readonly errorMapper: YahooFinanceErrorMapper,
  ) {}

  async checkHealth(): Promise<ProviderHealthSnapshot> {
    const startedAt = Date.now();
    try {
      await this.client.ping();
      const latencyMs = Date.now() - startedAt;
      this.lastSuccessfulRequestAt = new Date();
      this.consecutiveFailureCount = 0;
      this.logger.log({ msg: "yahoo.health.ok", latencyMs });
      return { status: "healthy", latencyMs, lastCheckedAt: new Date(), message: this.buildMessage() };
    } catch (err) {
      this.consecutiveFailureCount += 1;
      const classification = this.errorMapper.classify(err);
      const status = this.toOutageClassification(classification);
      this.logger.warn({ msg: "yahoo.health.failed", classification, consecutiveFailureCount: this.consecutiveFailureCount });
      return { status, latencyMs: Date.now() - startedAt, lastCheckedAt: new Date(), message: this.buildMessage() };
    }
  }

  private toOutageClassification(classification: ProviderErrorClassification): ProviderOutageClassification {
    if (classification === "provider_outage") return "down";
    if (classification === "rate_limited") return "degraded";
    return "unknown";
  }

  private buildMessage(): string {
    const lastSuccess = this.lastSuccessfulRequestAt ? this.lastSuccessfulRequestAt.toISOString() : "never";
    return `lastSuccessfulRequestAt=${lastSuccess} consecutiveFailureCount=${this.consecutiveFailureCount}`;
  }
}
