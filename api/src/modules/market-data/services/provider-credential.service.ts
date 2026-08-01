import { Injectable } from "@nestjs/common";
import { loadConfig } from "@rmsm/config";
import { NotFoundError } from "@rmsm/shared";
import type { MarketDataProviderType } from "@rmsm/database";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { ProviderRegistryService } from "../providers/provider-registry.service";
import { MarketDataStreamPublisherService, MARKET_DATA_STREAMS } from "./market-data-stream-publisher.service";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { FIP001_EVENTS } from "../../../common/events/fip001-events";

export type CredentialRequirement = "REQUIRED" | "OPTIONAL" | "NOT_APPLICABLE" | "NOT_YET_IMPLEMENTED";

export interface CredentialStatus {
  providerType: MarketDataProviderType;
  requirement: CredentialRequirement;
  configured: boolean;
}

export interface ConnectionTestResult {
  providerConfigId: string;
  providerType: MarketDataProviderType;
  success: boolean;
  latencyMs?: number;
  message?: string;
  testedAt: Date;
}

/**
 * FIP-001 Domain 1 "API credential management" / "Connection testing".
 * `MarketDataProviderConfig.credentialReference` (Phase 1's own design)
 * points at a secret stored in an EXTERNAL secrets manager — this
 * codebase never held the credential itself in the database. Every real
 * provider adapter today (`*.client.ts`) reads its API key straight from
 * `@rmsm/config` (an env var), which is that external reference's
 * present-day resolution. This service is the missing piece: whether
 * the credential a given provider TYPE needs is actually present, and
 * an on-demand real connection test against that provider — neither
 * existed before this phase. It never reads or returns the credential
 * value itself, only presence/absence and pass/fail.
 */
@Injectable()
export class ProviderCredentialService {
  constructor(
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly registry: ProviderRegistryService,
    private readonly streamPublisher: MarketDataStreamPublisherService,
    private readonly auditService: AuditService,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  /** Which credential (if any) a provider TYPE needs, and whether it's present — provider-type-aware, since Yahoo Finance genuinely has no API key (MD-004's own design) while Twelve Data/Alpha Vantage/CoinGecko do, and Binance/Polygon are still "future-ready" enum slots with no adapter implemented yet. */
  getCredentialStatus(providerType: MarketDataProviderType): CredentialStatus {
    const config = loadConfig();
    switch (providerType) {
      case "TWELVE_DATA":
        return { providerType, requirement: "REQUIRED", configured: Boolean(config.TWELVE_DATA_API_KEY) };
      case "ALPHA_VANTAGE":
        return { providerType, requirement: "REQUIRED", configured: Boolean(config.ALPHA_VANTAGE_API_KEY) };
      case "COINGECKO":
        return { providerType, requirement: "OPTIONAL", configured: Boolean(config.COINGECKO_API_KEY) };
      case "YAHOO_FINANCE":
        return { providerType, requirement: "NOT_APPLICABLE", configured: true };
      case "INTERNAL_FEED":
        return { providerType, requirement: "NOT_APPLICABLE", configured: true };
      case "BROKER_BRIDGE":
        // MT5 credentials (login/password/server) live in the Broker
        // module's own config (BR-001) — reported here as "configured"
        // only in the sense that this market-data layer has no
        // credential of its own to hold; the actual MT5 session
        // liveness is BrokerModule's concern, not this service's.
        return { providerType, requirement: "NOT_APPLICABLE", configured: true };
      case "BINANCE":
      case "POLYGON":
      case "TRADINGVIEW_BRIDGE":
        return { providerType, requirement: "NOT_YET_IMPLEMENTED", configured: false };
      default:
        return { providerType, requirement: "NOT_YET_IMPLEMENTED", configured: false };
    }
  }

  /**
   * Real, on-demand connection test — calls the registered provider's
   * own `healthProvider.checkHealth()` (every real adapter implements
   * this; see each provider's `*.health.ts`), not a fabricated
   * always-succeeds check. Records the outcome on the config row and
   * publishes ProviderConnected/ProviderDisconnected both in-process and
   * to the Redis stream.
   */
  async testConnection(providerConfigId: string, actorId: string | null, ctx: AuditContext = {}): Promise<ConnectionTestResult> {
    const config = await this.providerConfigRepository.findById(providerConfigId);
    if (!config) throw new NotFoundError("MarketDataProviderConfig", providerConfigId);

    const provider = this.registry.tryGet(config.type);
    const testedAt = new Date();

    if (!provider || !provider.healthProvider) {
      await this.providerConfigRepository.recordConnectionTest(providerConfigId, "FAILURE");
      return { providerConfigId, providerType: config.type, success: false, message: "Provider not registered or has no health check capability.", testedAt };
    }

    try {
      const snapshot = await provider.healthProvider.checkHealth();
      const success = snapshot.status === "healthy";
      await this.providerConfigRepository.recordConnectionTest(providerConfigId, success ? "SUCCESS" : "FAILURE");

      const eventName = success ? FIP001_EVENTS.PROVIDER_CONNECTED : FIP001_EVENTS.PROVIDER_DISCONNECTED;
      const payload = { providerConfigId, providerType: config.type, latencyMs: snapshot.latencyMs, message: snapshot.message };
      this.eventPublisher.publish(eventName, payload);
      await this.streamPublisher.publish(MARKET_DATA_STREAMS.PROVIDER, eventName, payload);

      await this.auditService.log("market_data.provider.connection_tested", {
        userId: actorId,
        entityType: "MarketDataProviderConfig",
        entityId: providerConfigId,
        metadata: { providerType: config.type, success },
        ...ctx,
      });

      return { providerConfigId, providerType: config.type, success, latencyMs: snapshot.latencyMs, message: snapshot.message, testedAt };
    } catch (error) {
      await this.providerConfigRepository.recordConnectionTest(providerConfigId, "FAILURE");
      const message = error instanceof Error ? error.message : String(error);
      this.eventPublisher.publish(FIP001_EVENTS.PROVIDER_DISCONNECTED, { providerConfigId, providerType: config.type, message });
      await this.streamPublisher.publish(MARKET_DATA_STREAMS.PROVIDER, FIP001_EVENTS.PROVIDER_DISCONNECTED, { providerConfigId, providerType: config.type, message });
      return { providerConfigId, providerType: config.type, success: false, message, testedAt };
    }
  }
}
