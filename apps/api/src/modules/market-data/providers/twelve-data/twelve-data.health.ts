import { Injectable, Logger } from "@nestjs/common";
import type { HealthProvider, ProviderHealthSnapshot } from "../../interfaces/health-provider.interface";
import type { ProviderOutageClassification } from "../../contracts/workflow.contracts";
import type { ProviderErrorClassification } from "../../interfaces/provider-error-mapper.interface";
import { TwelveDataClient } from "./twelve-data.client";
import { TwelveDataErrorMapper } from "./twelve-data.error-mapper";

/**
 * MD-001's required health snapshot: healthy/latency/last-successful-
 * request/failure-count. Reuses `ProviderOutageClassification`
 * (contracts/workflow.contracts.ts) for `status` rather than a
 * provider-specific status enum — HealthProvider's own doc comment
 * states the same "one vocabulary" rule. `checkHealth()` never throws: a
 * failed probe is reported AS a "down"/"degraded" snapshot, not an
 * exception every caller must remember to catch.
 */
@Injectable()
export class TwelveDataHealthProvider implements HealthProvider {
  private readonly logger = new Logger(TwelveDataHealthProvider.name);
  private lastSuccessfulRequestAt: Date | null = null;
  private consecutiveFailureCount = 0;

  constructor(
    private readonly client: TwelveDataClient,
    private readonly errorMapper: TwelveDataErrorMapper,
  ) {}

  async checkHealth(): Promise<ProviderHealthSnapshot> {
    const startedAt = Date.now();
    try {
      await this.client.ping();
      const latencyMs = Date.now() - startedAt;
      this.lastSuccessfulRequestAt = new Date();
      this.consecutiveFailureCount = 0;
      this.logger.log({ msg: "twelve_data.health.ok", latencyMs });
      return { status: "healthy", latencyMs, lastCheckedAt: new Date(), message: this.buildMessage() };
    } catch (err) {
      this.consecutiveFailureCount += 1;
      const classification = this.errorMapper.classify(err);
      const status = this.toOutageClassification(classification);
      this.logger.warn({ msg: "twelve_data.health.failed", classification, consecutiveFailureCount: this.consecutiveFailureCount });
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
