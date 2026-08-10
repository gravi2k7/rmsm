import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../../config/app-config.module";
import type { MarketDataProviderConfigModel } from "../../interfaces/models/reference-data.models";
import { ProviderRegistryService } from "../provider-registry.service";
import { ProviderFactoryService } from "../provider-factory.service";
import { TwelveDataClient } from "./twelve-data.client";
import { TwelveDataMapper } from "./twelve-data.mapper";
import { TwelveDataErrorMapper } from "./twelve-data.error-mapper";
import { TwelveDataRateLimiter, TWELVE_DATA_DEFAULT_REQUESTS_PER_MINUTE } from "./twelve-data.rate-limit";
import { TwelveDataHealthProvider } from "./twelve-data.health";
import { TwelveDataProvider } from "./twelve-data.provider";

/**
 * Registers Twelve Data with the same `ProviderRegistryService` /
 * `ProviderFactoryService` pair `ProviderRegistrarService` already
 * registers `InternalFeedProvider` with. Added directly to
 * `MarketDataModule`'s own `providers` array (see the one-line addition
 * in `market-data.module.ts`) rather than wrapped in a separately
 * `imports`-ed `@Module` — `ProviderRegistryService`/
 * `ProviderFactoryService` are provided (and exported) by
 * `MarketDataModule` itself, so a child module that needed them via
 * `imports: [MarketDataModule]` while also being imported BY
 * `MarketDataModule` would be a circular module dependency for no
 * benefit; sitting in the same `providers` array already gives this
 * class everything it needs from the same DI scope, with no cycle. This
 * file is still named `twelve-data.module.ts` per MD-001's required file
 * list — the module-shaped organization the name implies lives one level
 * up, in `MarketDataModule` itself, exactly as `ProviderRegistrarService`
 * already does for `InternalFeedProvider`.
 *
 * Builds TWO kinds of `TwelveDataProvider` instance, matching the
 * Registry/Factory split (`market-data-provider.interface.ts`'s own doc
 * comment on why both exist): one eagerly, from `@rmsm/config` env vars
 * alone, registered with the Registry at startup (the "is Twelve Data
 * available at all" answer everything else in this module queries); and
 * a builder function registered with the Factory that constructs a FRESH
 * instance per `MarketDataProviderConfig` DB row, honoring that row's
 * `baseUrl` / `rateLimitPerMinute` overrides when present (falling back
 * to the env defaults otherwise) — genuine support for the DB-driven
 * per-organization config path `ProviderConfigController` already
 * exposes, not a hardcoded env-only provider that ignores it.
 *
 * `credentialReference` resolution: this module reads the API key
 * directly from `@rmsm/config` (`TWELVE_DATA_API_KEY`), per MD-001's
 * explicit Configuration section. A `MarketDataProviderConfig` row's own
 * `credentialReference` field (resolving an externally-stored secret by
 * reference — see the Phase 2B architecture doc's note that this is
 * deliberately deferred) is a distinct, not-yet-built mechanism this
 * module does not attempt to resolve and does not claim to; a future
 * task wiring an actual secrets-manager lookup would extend
 * `buildProvider()` below, not this file's registration flow.
 */
@Injectable()
export class TwelveDataRegistrarService implements OnModuleInit {
  private readonly logger = new Logger(TwelveDataRegistrarService.name);

  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly factory: ProviderFactoryService,
    @Inject(APP_CONFIG) private readonly env: Env,
  ) {}

  onModuleInit(): void {
    const provider = this.buildProvider();
    this.registry.register(provider);
    this.factory.registerBuilder("TWELVE_DATA", (config) => this.buildProvider(config));

    if (!provider.enabled) {
      this.logger.warn("Twelve Data provider registered but disabled — TWELVE_DATA_API_KEY is not set.");
    }
  }

  private buildProvider(config?: MarketDataProviderConfigModel): TwelveDataProvider {
    const baseUrl = config?.baseUrl ?? this.env.TWELVE_DATA_BASE_URL;
    const requestsPerMinute = config?.rateLimitPerMinute ?? TWELVE_DATA_DEFAULT_REQUESTS_PER_MINUTE;

    const rateLimiter = new TwelveDataRateLimiter(requestsPerMinute);
    const client = new TwelveDataClient(
      {
        apiKey: this.env.TWELVE_DATA_API_KEY ?? "",
        baseUrl,
        timeoutMs: this.env.TWELVE_DATA_TIMEOUT,
        retryCount: this.env.TWELVE_DATA_RETRY_COUNT,
        retryDelayMs: this.env.TWELVE_DATA_RETRY_DELAY,
      },
      rateLimiter,
    );
    const mapper = new TwelveDataMapper();
    const errorMapper = new TwelveDataErrorMapper();
    const healthProvider = new TwelveDataHealthProvider(client, errorMapper);

    return new TwelveDataProvider(this.env.TWELVE_DATA_API_KEY, client, mapper, rateLimiter, errorMapper, healthProvider);
  }
}
