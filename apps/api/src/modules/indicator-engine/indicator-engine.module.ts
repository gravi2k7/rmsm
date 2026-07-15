import { Module } from "@nestjs/common";
import { IndicatorRegistryService } from "./registry/indicator-registry.service";
import { RegistryValidatorService } from "./registry/registry-validator.service";
import { RegistryQueryService } from "./registry/registry-query.service";
import { IndicatorDefinitionRegistrarService } from "./registry/indicator-definition-registrar.service";

/**
 * AI-102 Phase 2A: the registry layer, real for the first time (Phase 1
 * was contracts-only). `IndicatorRegistryService`
 * (registration/lookup/version-management), `RegistryValidatorService`
 * (registration-time validation, item 8), `RegistryQueryService`
 * (discovery, item 9), and `IndicatorDefinitionRegistrarService`
 * (startup registration of 28 named built-in + proprietary indicators,
 * item 10/11). No computation, no caching, no dependency EXECUTION, no
 * controllers — exactly this phase's own scope. `IndicatorInstance`
 * (registry/indicator-instance.ts) is deliberately NOT a provider here
 * — it's a plain class instantiated on demand by a future caller, never
 * a DI-managed singleton (an "instance" is a value, not a service).
 */
@Module({
  providers: [IndicatorRegistryService, RegistryValidatorService, RegistryQueryService, IndicatorDefinitionRegistrarService],
  exports: [IndicatorRegistryService, RegistryValidatorService, RegistryQueryService],
})
export class IndicatorEngineModule {}
