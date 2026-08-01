import { Injectable } from "@nestjs/common";
import type { AssetClass, MarketDataProviderType } from "@rmsm/database";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { ProviderRegistryService } from "../providers/provider-registry.service";
import { ProviderOrchestrationService, RetryOptions } from "./provider-orchestration.service";
import type { MarketDataProvider } from "../interfaces/market-data-provider.interface";

/**
 * FIP-001 Domain 1 "Provider priority" / "Provider failover". Builds the
 * priority-ordered candidate list ProviderOrchestrationService.
 * executeWithFailover() needs — the piece that was missing between
 * "each MarketDataProviderConfig row now has a priority" and "a call
 * that actually tries providers in that order and falls over on
 * failure." ProviderResolverService (Phase 2B) is deliberately left
 * untouched: it answers "which ONE provider should serve this request"
 * (a single resolution decision, still correct for read paths like
 * quote lookups where a caller wants exactly one answer). This service
 * answers a different question — "if my first choice fails, what's the
 * ordered list of others to try" — for write/import paths where falling
 * over to an alternate provider mid-operation is actually desirable.
 */
@Injectable()
export class ProviderFailoverService {
  constructor(
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly registry: ProviderRegistryService,
    private readonly orchestration: ProviderOrchestrationService,
  ) {}

  /** Active provider configs, in priority order, filtered to those actually registered+enabled and (if assetClass given) capable of serving it. */
  async getCandidateTypes(assetClass?: AssetClass): Promise<MarketDataProviderType[]> {
    const configs = await this.providerConfigRepository.listActiveByPriority();
    const candidates: MarketDataProviderType[] = [];
    for (const config of configs) {
      const provider = this.registry.tryGet(config.type);
      if (!provider || !provider.enabled) continue;
      if (assetClass && !provider.metadata.assetClasses.includes(assetClass)) continue;
      candidates.push(config.type);
    }
    return candidates;
  }

  /** Convenience wrapper: resolve candidates for the given asset class, then run the operation with failover across them. */
  async executeWithFailover<T>(
    assetClass: AssetClass | undefined,
    operation: (provider: MarketDataProvider) => Promise<T>,
    options: RetryOptions = {},
  ): Promise<{ result: T; providerType: MarketDataProviderType }> {
    const candidates = await this.getCandidateTypes(assetClass);
    return this.orchestration.executeWithFailover(candidates, operation, options);
  }
}
