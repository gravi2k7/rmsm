import { Injectable, Logger } from "@nestjs/common";
import type { HealthProvider, ProviderHealthSnapshot } from "../../interfaces/health-provider.interface";
import type { ProviderOutageClassification } from "../../contracts/workflow.contracts";
import type { ProviderErrorClassification } from "../../interfaces/provider-error-mapper.interface";
import { AlphaVantageClient } from "./alphavantage.client";
import { AlphaVantageErrorMapper } from "./alphavantage.error-mapper";

/**
 * MD-003's required health states: "Healthy / Degraded / Unavailable" —
 * these map 1:1 onto the existing `ProviderOutageClassification`
 * vocabulary (`"healthy" | "degraded" | "down" | "unknown"`, reused
 * since Phase 2B) as healthy/degraded/down, exactly like
 * `TwelveDataHealthProvider` and `CoinGeckoHealthProvider`. Never
 * throws — a failed probe is reported AS a snapshot, not an exception.
 */
@Injectable()
export class AlphaVantageHealthProvider implements HealthProvider {
  private readonly logger = new Logger(AlphaVantageHealthProvider.name);
  private lastSuccessfulRequestAt: Date | null = null;
  private consecutiveFailureCount = 0;

  constructor(
    private readonly client: AlphaVantageClient,
    private readonly errorMapper: AlphaVantageErrorMapper,
  ) {}

  async checkHealth(): Promise<ProviderHealthSnapshot> {
    const startedAt = Date.now();
    try {
      await this.client.ping();
      const latencyMs = Date.now() - startedAt;
      this.lastSuccessfulRequestAt = new Date();
      this.consecutiveFailureCount = 0;
      this.logger.log({ msg: "alphavantage.health.ok", latencyMs });
      return { status: "healthy", latencyMs, lastCheckedAt: new Date(), message: this.buildMessage() };
    } catch (err) {
      this.consecutiveFailureCount += 1;
      const classification = this.errorMapper.classify(err);
      const status = this.toOutageClassification(classification);
      this.logger.warn({ msg: "alphavantage.health.failed", classification, consecutiveFailureCount: this.consecutiveFailureCount });
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
