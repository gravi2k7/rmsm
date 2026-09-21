import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import type { Env } from "@rmsm/config";

import { APP_CONFIG } from "../../../../config/app-config.module";
import type { MarketDataProviderConfigModel } from "../../interfaces/models/reference-data.models";
import { ProviderRegistryService } from "../provider-registry.service";
import { ProviderFactoryService } from "../provider-factory.service";

export { CTraderFixClient } from "./ctrader-fix.client";
import { CTraderFixClient } from "./ctrader-fix.client";
import { CTraderFixErrorMapper } from "./ctrader-fix.error-mapper";
import { CTraderFixHealthProvider } from "./ctrader-fix.health";
import { CTraderFixRateLimiter } from "./ctrader-fix.rate-limit";
import { CTraderFixProvider } from "./ctrader-fix.provider";
import { CTraderInstrumentCatalogService } from "./ctrader-fix.catalog.service";
import { CTraderInstrumentCatalogSynchronizer } from "./ctrader-fix.catalog-synchronizer";
import { CTraderInstrumentCatalogBootstrapService } from "./ctrader-fix.catalog.bootstrap";
import { CTraderFixInstrumentResolver } from "./ctrader-fix.instrument-resolver";
import { InstrumentRepository } from "../../repositories/instrument.repository";
import { InstrumentAliasRepository } from "../../repositories/instrument-alias.repository";
import { MarketDataProviderConfigRepository } from "../../repositories/market-data-provider-config.repository";
import { CTraderOpenApiClient } from "./openapi/ctrader-openapi.client";
import { CTraderOpenApiHistoricalClient } from "./openapi/ctrader-openapi.historical.client";

@Injectable()
export class CTraderOpenApiClientFactory {
  constructor(
    @Inject(APP_CONFIG)
    private readonly env: Env,
  ) {}

  create(): CTraderOpenApiClient {
    return new CTraderOpenApiClient({
      host: this.env.CTRADER_OPENAPI_HOST,
      port: this.env.CTRADER_OPENAPI_PORT,
      clientId: this.env.CTRADER_OPENAPI_CLIENT_ID ?? "",
      clientSecret: this.env.CTRADER_OPENAPI_CLIENT_SECRET ?? "",
      accessToken: this.env.CTRADER_OPENAPI_ACCESS_TOKEN ?? "",
      accountId: this.env.CTRADER_OPENAPI_ACCOUNT_ID ?? 0,
      connectTimeoutMs: this.env.CTRADER_OPENAPI_CONNECT_TIMEOUT,
      requestTimeoutMs: this.env.CTRADER_OPENAPI_REQUEST_TIMEOUT,
    });
  }
}

@Injectable()
export class CTraderFixClientFactory {
  constructor(
    @Inject(APP_CONFIG)
    private readonly env: Env,
  ) {}

  create(): CTraderFixClient {
    return new CTraderFixClient({
      host: this.env.CTRADER_FIX_HOST,
      port: this.env.CTRADER_FIX_PORT,
      tls: this.env.CTRADER_FIX_TLS,
      senderCompId: this.env.CTRADER_FIX_SENDER_COMP_ID ?? "",
      targetCompId: this.env.CTRADER_FIX_TARGET_COMP_ID,
      senderSubId: this.env.CTRADER_FIX_SENDER_SUB_ID,
      targetSubId: this.env.CTRADER_FIX_TARGET_SUB_ID,
      username: this.env.CTRADER_FIX_USERNAME ?? "",
      password: this.env.CTRADER_FIX_PASSWORD ?? "",
      heartbeatIntervalMs: this.env.CTRADER_FIX_HEARTBEAT_INTERVAL,
      connectTimeoutMs: this.env.CTRADER_FIX_CONNECT_TIMEOUT,
      reconnectDelayMs: this.env.CTRADER_FIX_RECONNECT_DELAY,
      maxReconnectAttempts: this.env.CTRADER_FIX_MAX_RECONNECT_ATTEMPTS,
      resetSequenceOnLogon: this.env.CTRADER_FIX_LOGON_RESET_SEQUENCE,
    });
  }
}

export const cTraderFixClientProvider = {
  provide: CTraderFixClient,
  inject: [CTraderFixClientFactory],
  useFactory: (factory: CTraderFixClientFactory): CTraderFixClient =>
    factory.create(),
};

@Injectable()
export class CTraderFixRegistrarService implements OnModuleInit {
  private readonly logger = new Logger(CTraderFixRegistrarService.name);

  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly factory: ProviderFactoryService,
    private readonly client: CTraderFixClient,
    @Inject(APP_CONFIG)
    private readonly env: Env,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly openApiClient: CTraderOpenApiClient,
    @Optional()
    private readonly aliasRepository?: InstrumentAliasRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const config =
      await this.providerConfigRepository.findByType("CTRADER");

    const provider = this.buildProvider(config ?? undefined);

    this.registry.register(provider);

    this.factory.registerBuilder(
      "CTRADER",
      (config) => this.buildProvider(config),
    );

    if (!this.isConfigured()) {
      this.logger.log(
        "cTrader FIX credentials are not configured; initial connection skipped.",
      );
      return;
    }

    void this.client.connect().catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Initial cTrader FIX connection failed: ${message}`,
      );
    });
  }

  private buildProvider(
    config?: MarketDataProviderConfigModel,
  ): CTraderFixProvider {
    const client = this.client;

    const rateLimiter = new CTraderFixRateLimiter();
    const errorMapper = new CTraderFixErrorMapper();
    const healthProvider = new CTraderFixHealthProvider(client);

    let historicalDataClient;

    if (
      this.env.CTRADER_OPENAPI_ENABLED &&
      this.env.CTRADER_OPENAPI_CLIENT_ID &&
      this.env.CTRADER_OPENAPI_CLIENT_SECRET &&
      this.env.CTRADER_OPENAPI_ACCESS_TOKEN &&
      this.env.CTRADER_OPENAPI_ACCOUNT_ID &&
      this.aliasRepository &&
      config?.id
    ) {
      historicalDataClient = new CTraderOpenApiHistoricalClient(
        this.openApiClient,
        this.aliasRepository,
        config.id,
        this.env.CTRADER_OPENAPI_ACCOUNT_ID,
      );
    }

    return new CTraderFixProvider(
      client,
      rateLimiter,
      errorMapper,
      healthProvider,
      this.isConfigured(config),
      historicalDataClient,
    );
  }

  private isConfigured(
    _config?: MarketDataProviderConfigModel,
  ): boolean {
    /*
     * credentialReference is intentionally not treated as sufficient here.
     *
     * The cTrader FIX credentials currently come exclusively from the
     * centralized production environment configuration. A database
     * credentialReference must not enable the provider until RMSM has an
     * explicit credential-resolution service for cTrader FIX.
     */
    return Boolean(
      this.env.CTRADER_FIX_SENDER_COMP_ID &&
      this.env.CTRADER_FIX_USERNAME &&
      this.env.CTRADER_FIX_PASSWORD,
    );
  }
}
