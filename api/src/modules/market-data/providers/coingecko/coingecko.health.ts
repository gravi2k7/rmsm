import { Injectable, Logger } from "@nestjs/common";
import type { HealthProvider, ProviderHealthSnapshot } from "../../interfaces/health-provider.interface";
import type { ProviderOutageClassification } from "../../contracts/workflow.contracts";
import type { ProviderErrorClassification } from "../../interfaces/provider-error-mapper.interface";
import { CoinGeckoClient } from "./coingecko.client";
import { CoinGeckoErrorMapper } from "./coingecko.error-mapper";

/**
 * MD-002's required health check (healthy, latency, last successful
 * request, failure count) — same shape and behavior as
 * `TwelveDataHealthProvider`: probes via the cheapest available call
 * (`/ping`, which CoinGecko publishes for exactly this purpose), reuses
 * `ProviderOutageClassification`, and never throws.
 */
@Injectable()
export class CoinGeckoHealthProvider implements HealthProvider {
  private readonly logger = new Logger(CoinGeckoHealthProvider.name);
  private lastSuccessfulRequestAt: Date | null = null;
  private consecutiveFailureCount = 0;

  constructor(
    private readonly client: CoinGeckoClient,
    private readonly errorMapper: CoinGeckoErrorMapper,
  ) {}

  async checkHealth(): Promise<ProviderHealthSnapshot> {
    const startedAt = Date.now();
    try {
      await this.client.ping();
      const latencyMs = Date.now() - startedAt;
      this.lastSuccessfulRequestAt = new Date();
      this.consecutiveFailureCount = 0;
      this.logger.log({ msg: "coingecko.health.ok", latencyMs });
      return { status: "healthy", latencyMs, lastCheckedAt: new Date(), message: this.buildMessage() };
    } catch (err) {
      this.consecutiveFailureCount += 1;
      const classification = this.errorMapper.classify(err);
      const status = this.toOutageClassification(classification);
      this.logger.warn({ msg: "coingecko.health.failed", classification, consecutiveFailureCount: this.consecutiveFailureCount });
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
