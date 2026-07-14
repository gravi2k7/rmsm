import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import type {
  ProviderResolver as ProviderResolverContract,
  ProviderResolutionContext,
} from "../interfaces/provider-resolver.interface";
import type { MarketDataProvider } from "../interfaces/market-data-provider.interface";
import { ProviderRegistryService } from "./provider-registry.service";

/**
 * Real implementation of the resolution precedence documented in
 * `interfaces/provider-resolver.interface.ts`: explicit organization
 * preference (if enabled and capable) wins outright; otherwise the
 * first enabled provider supporting the requested asset class;
 * otherwise a ValidationError, not a silent fallback to some arbitrary
 * provider a caller didn't ask for.
 */
@Injectable()
export class ProviderResolverService implements ProviderResolverContract {
  constructor(private readonly registry: ProviderRegistryService) {}

  resolve(context: ProviderResolutionContext): MarketDataProvider {
    if (context.organizationPreferredProviderType) {
      const preferred = this.registry.tryGet(context.organizationPreferredProviderType);
      if (preferred?.enabled && this.supportsContext(preferred, context)) {
        return preferred;
      }
      // Preferred provider isn't usable for this request — fall through
      // to capability-based resolution rather than throwing immediately;
      // an organization's stored preference going stale (provider
      // disabled, or doesn't cover a newly-requested asset class)
      // shouldn't hard-fail every request until someone updates that
      // preference elsewhere.
    }

    const candidates = this.registry.findByCapability((metadata) => {
      if (context.assetClass && !metadata.assetClasses.includes(context.assetClass)) return false;
      if (context.exchangeCode && !metadata.marketsSupported.includes(context.exchangeCode)) return false;
      return true;
    });

    const first = candidates[0];
    if (!first) {
      throw new ValidationError(
        `No enabled provider found matching the requested context (assetClass=${context.assetClass ?? "any"}, exchangeCode=${context.exchangeCode ?? "any"}).`,
      );
    }
    return first;
  }

  private supportsContext(provider: MarketDataProvider, context: ProviderResolutionContext): boolean {
    if (context.assetClass && !provider.metadata.assetClasses.includes(context.assetClass)) return false;
    if (context.exchangeCode && !provider.metadata.marketsSupported.includes(context.exchangeCode)) return false;
    return true;
  }
}
