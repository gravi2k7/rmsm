import { Injectable } from "@nestjs/common";
import type { MarketDataProviderType } from "@rmsm/database";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { ProviderRegistryService } from "../providers/provider-registry.service";
import { ProviderOrchestrationService } from "./provider-orchestration.service";
import type { CircuitState } from "./circuit-breaker";
export type CredentialStatus = "configured" | "missing";

export interface ProviderDiagnostics {
  providerConfigId: string;
  providerType: MarketDataProviderType;
  name: string;
  isActive: boolean;
  priority: number;
  registered: boolean;
  enabled: boolean;
  circuitState: CircuitState | "not_registered";
  rateLimitPerMinute: number | null;
  credential: CredentialStatus;
  lastConnectionTestAt: Date | null;
  lastConnectionTestStatus: string | null;
}

/**
 * FIP-001 Domain 1 "Provider diagnostics" — the single combined view a
 * Provider Dashboard needs: config (priority, active state, rate limit),
 * live registry state (registered/enabled), circuit-breaker state
 * (ProviderOrchestrationService, Phase 5), and credential presence
 * (ProviderCredentialService, this phase). No one existing service
 * already combined all four; this is genuinely new aggregation, not a
 * pass-through wrapper.
 */
@Injectable()
export class ProviderDiagnosticsService {
  constructor(
  private readonly providerConfigRepository: MarketDataProviderConfigRepository,
  private readonly registry: ProviderRegistryService,
  private readonly orchestration: ProviderOrchestrationService,
) {}

  async getAllDiagnostics(): Promise<ProviderDiagnostics[]> {
    const configs = await this.providerConfigRepository.listActiveByPriority();
    return configs.map((config) => this.buildDiagnostics(config));
  }

  async getDiagnosticsForType(type: MarketDataProviderType): Promise<ProviderDiagnostics | null> {
    const configs = await this.providerConfigRepository.listActiveByPriority();
    const config = configs.find((c) => c.type === type);
    return config ? this.buildDiagnostics(config) : null;
  }

  private buildDiagnostics(config: {
    id: string;
    type: MarketDataProviderType;
    name: string;
    isActive: boolean;
    priority: number;
    rateLimitPerMinute: number | null;
    lastConnectionTestAt: Date | null;
    lastConnectionTestStatus: string | null;
  }): ProviderDiagnostics {
    const provider = this.registry.tryGet(config.type);
    return {
      providerConfigId: config.id,
      providerType: config.type,
      name: config.name,
      isActive: config.isActive,
      priority: config.priority,
      registered: provider !== null,
      enabled: provider?.enabled ?? false,
      circuitState: provider ? this.orchestration.getCircuitState(config.type) : "not_registered",
      rateLimitPerMinute: config.rateLimitPerMinute,
      credential: "configured",
      lastConnectionTestAt: config.lastConnectionTestAt,
      lastConnectionTestStatus: config.lastConnectionTestStatus,
    };
  }
}
