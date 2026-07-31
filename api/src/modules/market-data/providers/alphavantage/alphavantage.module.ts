import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../../config/app-config.module";
import type { MarketDataProviderConfigModel } from "../../interfaces/models/reference-data.models";
import { ProviderRegistryService } from "../provider-registry.service";
import { ProviderFactoryService } from "../provider-factory.service";
import { AlphaVantageClient } from "./alphavantage.client";
import { AlphaVantageMapper } from "./alphavantage.mapper";
import { AlphaVantageErrorMapper } from "./alphavantage.error-mapper";
import { AlphaVantageRateLimiter } from "./alphavantage.rate-limit";
import { AlphaVantageHealthProvider } from "./alphavantage.health";
import { AlphaVantageCacheService } from "./alphavantage.cache";
import { AlphaVantageProvider } from "./alphavantage.provider";
import {
  ALPHA_VANTAGE_DEFAULT_RETRY_COUNT,
  ALPHA_VANTAGE_DEFAULT_RETRY_DELAY_MS,
  ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_MINUTE,
  ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY,
} from "./alphavantage.constants";

/**
 * Registers Alpha Vantage with the same `ProviderRegistryService` /
 * `ProviderFactoryService` pair every other provider registers with —
 * added directly to `MarketDataModule`'s own `providers` array, never a
 * separately-`imports`-ed child module, same circular-import reason
 * documented on `TwelveDataRegistrarService`/`CoinGeckoRegistrarService`.
 *
 * `AlphaVantageCacheService` is injected here (one real Nest-managed
 * Redis-backed singleton) and shared across every `AlphaVantageProvider`
 * this registrar builds — same rationale as `CoinGeckoRegistrarService`.
 *
 * `config?.rateLimitPerMinute` (from a `MarketDataProviderConfig` DB
 * row) only overrides the per-MINUTE dimension of the dual sliding
 * window; there is no DB-row equivalent for a per-DAY limit, so the day
 * dimension always stays at `ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY`
 * regardless of any config-row override. Worth stating explicitly since
 * it's the one place this registrar's override behavior isn't symmetric
 * with `CoinGeckoRegistrarService`'s single-window equivalent.
 */
@Injectable()
export class AlphaVantageRegistrarService implements OnModuleInit {
  private readonly logger = new Logger(AlphaVantageRegistrarService.name);

  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly factory: ProviderFactoryService,
    private readonly cache: AlphaVantageCacheService,
    @Inject(APP_CONFIG) private readonly env: Env,
  ) {}

  onModuleInit(): void {
    const provider = this.buildProvider();
    this.registry.register(provider);
    this.factory.registerBuilder("ALPHA_VANTAGE", (config) => this.buildProvider(config));
  }

  private buildProvider(config?: MarketDataProviderConfigModel): AlphaVantageProvider {
    const baseUrl = config?.baseUrl ?? this.env.ALPHA_VANTAGE_BASE_URL;
    const requestsPerMinute = config?.rateLimitPerMinute ?? this.env.ALPHA_VANTAGE_RATE_LIMIT ?? ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_MINUTE;

    const rateLimiter = new AlphaVantageRateLimiter(requestsPerMinute, ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY);
    const client = new AlphaVantageClient(
      {
        apiKey: this.env.ALPHA_VANTAGE_API_KEY,
        baseUrl,
        timeoutMs: this.env.ALPHA_VANTAGE_TIMEOUT,
        retryCount: ALPHA_VANTAGE_DEFAULT_RETRY_COUNT,
        retryDelayMs: ALPHA_VANTAGE_DEFAULT_RETRY_DELAY_MS,
      },
      rateLimiter,
    );
    const mapper = new AlphaVantageMapper();
    const errorMapper = new AlphaVantageErrorMapper();
    const healthProvider = new AlphaVantageHealthProvider(client, errorMapper);

    return new AlphaVantageProvider(
      this.env.ALPHA_VANTAGE_API_KEY,
      client,
      mapper,
      this.cache,
      this.env.MARKET_DATA_CACHE_TTL_MS,
      rateLimiter,
      errorMapper,
      healthProvider,
    );
  }
}
