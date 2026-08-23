import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../../config/app-config.module";
import type { MarketDataProviderConfigModel } from "../../interfaces/models/reference-data.models";
import { ProviderRegistryService } from "../provider-registry.service";
import { ProviderFactoryService } from "../provider-factory.service";
import { CoinGeckoClient } from "./coingecko.client";
import { CoinGeckoMapper } from "./coingecko.mapper";
import { CoinGeckoErrorMapper } from "./coingecko.error-mapper";
import { CoinGeckoRateLimiter } from "./coingecko.rate-limit";
import { CoinGeckoHealthProvider } from "./coingecko.health";
import { CoinGeckoCacheService } from "./coingecko.cache";
import { CoinGeckoProvider } from "./coingecko.provider";
import {
  COINGECKO_DEFAULT_TIMEOUT_MS,
  COINGECKO_DEFAULT_RETRY_COUNT,
  COINGECKO_DEFAULT_RETRY_DELAY_MS,
  COINGECKO_DEFAULT_REQUESTS_PER_MINUTE,
} from "./coingecko.constants";

/**
 * Registers CoinGecko with the same `ProviderRegistryService` /
 * `ProviderFactoryService` pair `TwelveDataRegistrarService` and
 * `ProviderRegistrarService` already register their providers with —
 * added directly to `MarketDataModule`'s own `providers` array for the
 * exact same circular-import reason documented on
 * `TwelveDataRegistrarService` (twelve-data.module.ts).
 *
 * `CoinGeckoCacheService` is injected here (a real Nest-managed
 * singleton — one Redis connection for the whole CoinGecko integration)
 * and handed to every `CoinGeckoProvider` this registrar builds, unlike
 * `CoinGeckoClient`/`CoinGeckoRateLimiter`, which are constructed fresh
 * per instance because their config (timeout, base URL, rate limit) can
 * differ per `MarketDataProviderConfig` row — a cache connection has no
 * such per-row variation, so sharing it is strictly better than opening
 * a redundant Redis connection per registered instance.
 */
@Injectable()
export class CoinGeckoRegistrarService implements OnModuleInit {
  private readonly logger = new Logger(CoinGeckoRegistrarService.name);

  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly factory: ProviderFactoryService,
    private readonly cache: CoinGeckoCacheService,
    @Inject(APP_CONFIG) private readonly env: Env,
  ) {}

  onModuleInit(): void {
    const provider = this.buildProvider();
    this.registry.register(provider);
    this.factory.registerBuilder("COINGECKO", (config) => this.buildProvider(config));
  }

  private buildProvider(config?: MarketDataProviderConfigModel): CoinGeckoProvider {
    const baseUrl = config?.baseUrl ?? this.env.COINGECKO_BASE_URL;
    const requestsPerMinute = config?.rateLimitPerMinute ?? COINGECKO_DEFAULT_REQUESTS_PER_MINUTE;

    const rateLimiter = new CoinGeckoRateLimiter(requestsPerMinute);
    const client = new CoinGeckoClient(
      {
        apiKey: this.env.COINGECKO_API_KEY,
        baseUrl,
        timeoutMs: COINGECKO_DEFAULT_TIMEOUT_MS,
        retryCount: COINGECKO_DEFAULT_RETRY_COUNT,
        retryDelayMs: COINGECKO_DEFAULT_RETRY_DELAY_MS,
      },
      rateLimiter,
    );
    const mapper = new CoinGeckoMapper();
    const errorMapper = new CoinGeckoErrorMapper();
    const healthProvider = new CoinGeckoHealthProvider(client, errorMapper);

    return new CoinGeckoProvider(client, mapper, this.cache, rateLimiter, errorMapper, healthProvider);
  }
}
