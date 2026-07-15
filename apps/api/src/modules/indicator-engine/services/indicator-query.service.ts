import { Injectable } from "@nestjs/common";
import { IndicatorRegistryService } from "../registry/indicator-registry.service";
import { RegistryQueryService } from "../registry/registry-query.service";
import type { IndicatorQueryService as IndicatorQueryServiceContract } from "../contracts/service-contracts.interface";
import type { QueryIndicatorRequest, IndicatorListResponse, IndicatorMetadataResponse } from "../contracts/service-models.interface";
import type { ParameterDefinition } from "../contracts/parameter-definition.interface";
import { IndicatorServiceException } from "../contracts/service.errors";

/**
 * Real implementation of `contracts/service-contracts.interface.ts`'s
 * `IndicatorQueryService` — item 2's own 6 responsibilities, entirely
 * a thin wrapper over Phase 2A's `IndicatorRegistryService`/
 * `RegistryQueryService`. "Registry only" (item 2's own words) — never
 * touches AI-101, never invokes a calculation.
 */
@Injectable()
export class IndicatorQueryServiceImpl implements IndicatorQueryServiceContract {
  constructor(
    private readonly registry: IndicatorRegistryService,
    private readonly query: RegistryQueryService,
  ) {}

  list(request: QueryIndicatorRequest): IndicatorListResponse {
    let indicators = this.query.search({ category: request.category, tags: request.tags });
    if (request.identifier) {
      indicators = indicators.filter((d) => d.identifier === request.identifier);
    }
    if (request.version) {
      indicators = indicators.filter((d) => d.version === request.version);
    }
    return { indicators, totalCount: indicators.length };
  }

  lookup(identifier: string, version?: string): IndicatorMetadataResponse {
    try {
      const definition = version ? this.registry.getVersion(identifier, version) : this.registry.get(identifier);
      return { definition };
    } catch (error) {
      throw new IndicatorServiceException(`Lookup failed for "${identifier}"${version ? `@${version}` : ""}: ${error instanceof Error ? error.message : String(error)}`, { identifier, version });
    }
  }

  listCategories(): string[] {
    return [...new Set(this.registry.listAll().map((d) => d.category))];
  }

  listVersions(identifier: string): string[] {
    return this.registry.listVersions(identifier).map((d) => d.version);
  }

  inspectParameters(identifier: string, version?: string): ParameterDefinition[] {
    return this.lookup(identifier, version).definition.inputs;
  }
}
