import { Injectable } from "@nestjs/common";
import type { IndicatorDefinition } from "../contracts/indicator-definition.interface";
import type { RegistryQuery as RegistryQueryContract, IndicatorDiscoveryFilter } from "../contracts/registry-query.interface";
import { IndicatorRegistryService } from "./indicator-registry.service";

/**
 * Real implementation of `contracts/registry-query.interface.ts` — a
 * read-only filter/search layer over `IndicatorRegistryService.listAll()`,
 * never a second store of definitions (see that interface's own
 * comment). Every filter field is optional and independently
 * applicable — a caller can combine any subset (e.g. category +
 * timeframe together), not forced into one lookup dimension at a time.
 */
@Injectable()
export class RegistryQueryService implements RegistryQueryContract {
  constructor(private readonly registry: IndicatorRegistryService) {}

  search(filter: IndicatorDiscoveryFilter): IndicatorDefinition[] {
    let results = this.registry.listAll();

    if (filter.category) {
      results = results.filter((d) => d.category === filter.category);
    }
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter((d) => filter.tags!.every((tag) => d.tags.includes(tag)));
    }
    if (filter.timeframe) {
      results = results.filter((d) => d.supportedTimeframes.includes(filter.timeframe!));
    }
    if (filter.version) {
      // A version-specific search bypasses listAll()'s "latest only"
      // view — resolved per-identifier via listVersions(), since the
      // requested version might not be any given identifier's latest.
      results = results
        .map((d) => this.registry.listVersions(d.identifier).find((v) => v.version === filter.version))
        .filter((d): d is IndicatorDefinition => d !== undefined);
    }
    if (filter.capability) {
      results = results.filter((d) => {
        if (filter.capability!.incrementalSupport !== undefined && d.metadata.incrementalSupport !== filter.capability!.incrementalSupport) return false;
        if (filter.capability!.cacheable !== undefined && d.metadata.cacheable !== filter.capability!.cacheable) return false;
        if (filter.capability!.calculationType !== undefined && d.metadata.calculationType !== filter.capability!.calculationType) return false;
        return true;
      });
    }

    return results;
  }
}
