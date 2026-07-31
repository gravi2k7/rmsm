import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../../config/app-config.module";
import type { MarketDataProviderConfigModel } from "../../interfaces/models/reference-data.models";
import { ProviderRegistryService } from "../provider-registry.service";
import { ProviderFactoryService } from "../provider-factory.service";
import { YahooFinanceClient } from "./yahoo-finance.client";
import { YahooFinanceMapper } from "./yahoo-finance.mapper";
import { YahooFinanceErrorMapper } from "./yahoo-finance.error-mapper";
import { YahooFinanceRateLimiter } from "./yahoo-finance.rate-limit";
import { YahooFinanceHealthProvider } from "./yahoo-finance.health";
import { YahooFinanceCacheService } from "./yahoo-finance.cache";
import { YahooFinanceProvider } from "./yahoo-finance.provider";
import { YAHOO_DEFAULT_REQUESTS_PER_MINUTE } from "./yahoo-finance.constants";

const YAHOO_DEFAULT_BASE_URL = "https://query1.finance.yahoo.com";

/**
 * Registers Yahoo Finance with the same `ProviderRegistryService` /
 * `ProviderFactoryService` pair every other provider registers with —
 * added directly to `MarketDataModule`'s own `providers` array, same
 * circular-import reason documented on every prior registrar since
 * `TwelveDataRegistrarService`.
 *
 * `YahooFinanceCacheService` is injected here (one real Nest-managed
 * Redis-backed singleton) and shared across every `YahooFinanceProvider`
 * this registrar builds — same rationale as every other cache-sharing
 * registrar in this module.
 *
 * `config?.baseUrl` overrides `YAHOO_BASE_URL`-equivalent behavior even
 * though MD-004 names no dedicated base-URL env var — the same
 * config-row-override mechanism `ProviderFactoryService.create()`
 * already applies uniformly to every provider is honored here too,
 * rather than special-casing Yahoo Finance to ignore it.
 */
@Injectable()
export class YahooFinanceRegistrarService implements OnModuleInit {
  private readonly logger = new Logger(YahooFinanceRegistrarService.name);

  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly factory: ProviderFactoryService,
    private readonly cache: YahooFinanceCacheService,
    @Inject(APP_CONFIG) private readonly env: Env,
  ) {}

  onModuleInit(): void {
    const provider = this.buildProvider();
    this.registry.register(provider);
    this.factory.registerBuilder("YAHOO_FINANCE", (config) => this.buildProvider(config));
  }

  private buildProvider(config?: MarketDataProviderConfigModel): YahooFinanceProvider {
    const baseUrl = config?.baseUrl ?? YAHOO_DEFAULT_BASE_URL;
    const requestsPerMinute = config?.rateLimitPerMinute ?? YAHOO_DEFAULT_REQUESTS_PER_MINUTE;

    const rateLimiter = new YahooFinanceRateLimiter(requestsPerMinute);
    const client = new YahooFinanceClient({ baseUrl, timeoutMs: this.env.YAHOO_TIMEOUT, retryCount: this.env.YAHOO_RETRY_COUNT }, rateLimiter);
    const mapper = new YahooFinanceMapper();
    const errorMapper = new YahooFinanceErrorMapper();
    const healthProvider = new YahooFinanceHealthProvider(client, errorMapper);
    const baseCacheTtlMs = this.env.YAHOO_CACHE_TTL * 1_000;

    return new YahooFinanceProvider(this.env.YAHOO_ENABLED, client, mapper, this.cache, baseCacheTtlMs, rateLimiter, errorMapper, healthProvider);
  }
}
