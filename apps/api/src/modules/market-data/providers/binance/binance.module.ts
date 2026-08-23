import { Injectable, OnModuleInit } from "@nestjs/common";
import { ProviderRegistryService } from "../provider-registry.service";
import { ProviderFactoryService } from "../provider-factory.service";
import type { MarketDataProviderConfigModel } from "../../interfaces/models/reference-data.models";
import {
  BINANCE_DEFAULT_BASE_URL,
  BINANCE_DEFAULT_RETRY_COUNT,
  BINANCE_DEFAULT_RETRY_DELAY_MS,
  BINANCE_DEFAULT_TIMEOUT_MS,
  BINANCE_DEFAULT_REQUESTS_PER_MINUTE,
} from "./binance.constants";
import { BinanceClient } from "./binance.client";
import { BinanceMapper } from "./binance.mapper";
import { BinanceErrorMapper } from "./binance.error-mapper";
import { BinanceRateLimiter } from "./binance.rate-limit";
import { BinanceHealthProvider } from "./binance.health";
import { BinanceProvider } from "./binance.provider";

@Injectable()
export class BinanceRegistrarService implements OnModuleInit {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly factory: ProviderFactoryService,
  ) {}

  onModuleInit(): void {
    const provider = this.buildProvider();

    this.registry.register(provider);

    this.factory.registerBuilder(
      "BINANCE",
      (config) => this.buildProvider(config),
    );
  }

  private buildProvider(
    config?: MarketDataProviderConfigModel,
  ): BinanceProvider {
    const rateLimiter = new BinanceRateLimiter(
      config?.rateLimitPerMinute ??
        BINANCE_DEFAULT_REQUESTS_PER_MINUTE,
    );

    const client = new BinanceClient(
      {
        baseUrl:
          config?.baseUrl ?? BINANCE_DEFAULT_BASE_URL,
        timeoutMs: BINANCE_DEFAULT_TIMEOUT_MS,
        retryCount: BINANCE_DEFAULT_RETRY_COUNT,
        retryDelayMs: BINANCE_DEFAULT_RETRY_DELAY_MS,
      },
      rateLimiter,
    );

    const mapper = new BinanceMapper();
    const errorMapper = new BinanceErrorMapper();
    const healthProvider = new BinanceHealthProvider(
      client,
      errorMapper,
    );

    return new BinanceProvider(
      client,
      mapper,
      rateLimiter,
      errorMapper,
      healthProvider,
    );
  }
}
