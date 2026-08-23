import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
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
  ) {}

  onModuleInit(): void {
    const provider = this.buildProvider();

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

    return new CTraderFixProvider(
      client,
      rateLimiter,
      errorMapper,
      healthProvider,
      this.isConfigured(config),
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
