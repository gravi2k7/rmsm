import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../../config/app-config.module";
import { BrokerRegistryService } from "../broker-registry.service";
import { MetaTrader5Client } from "./metatrader5.client";
import { MetaTrader5ErrorMapper } from "./metatrader5.error-mapper";
import { MetaTrader5SessionManager } from "./metatrader5.session-manager";
import { MetaTrader5ConnectionManager } from "./metatrader5.connection-manager";
import { MetaTrader5CacheService } from "./metatrader5.cache";
import { MetaTrader5AccountService } from "./metatrader5.account.service";
import { MetaTrader5SymbolService } from "./metatrader5.symbol.service";
import { MetaTrader5MarketService } from "./metatrader5.market.service";
import { MetaTrader5OrderService } from "./metatrader5.order.service";
import { MetaTrader5PositionService } from "./metatrader5.position.service";
import { MetaTrader5HistoryService } from "./metatrader5.history.service";
import { MetaTrader5StreamingService } from "./metatrader5.streaming.service";
import { MetaTrader5RiskService } from "./metatrader5.risk.service";
import { MetaTrader5HealthProvider } from "./metatrader5.health";
import { MetaTrader5Provider } from "./metatrader5.provider";

/**
 * Registers `MetaTrader5Provider` with `BrokerRegistryService` — the
 * Broker domain's equivalent of every Market Data `*RegistrarService`
 * (`TwelveDataRegistrarService` etc.), added directly to `BrokerModule`'s
 * own `providers` array for the same reason documented on every prior
 * registrar (this file constructs concrete provider internals; the
 * module wiring that would otherwise need to import them directly is
 * kept out of `broker.module.ts` itself).
 *
 * Deliberately no `factory.registerBuilder()` call — `BrokerRegistryService`
 * has no companion Factory by design (see `broker-registry.service.ts`'s
 * own doc comment: brokers are singleton stateful connections resolved
 * once at boot, not per-config-row constructed the way Market Data
 * providers are).
 *
 * `MetaTrader5CacheService` and `MetaTrader5Client` are NOT connected or
 * logged in here — `onModuleInit()` only builds and registers the
 * provider object graph. Actual `connect()`/`login()` happens on first
 * genuine use (or via an explicit future bootstrap step), matching
 * `MetaTrader5Provider`'s own doc comment on why connecting is not
 * performed eagerly during construction.
 */
@Injectable()
export class MetaTrader5RegistrarService implements OnModuleInit {
  private readonly logger = new Logger(MetaTrader5RegistrarService.name);

  constructor(
    private readonly registry: BrokerRegistryService,
    private readonly cache: MetaTrader5CacheService,
    @Inject(APP_CONFIG) private readonly env: Env,
  ) {}

  onModuleInit(): void {
    const provider = this.buildProvider();
    this.registry.register(provider);
    this.logger.log({ msg: "mt5.registered", enabled: provider.enabled });
  }

  private buildProvider(): MetaTrader5Provider {
    const client = new MetaTrader5Client({
      gatewayUrl: this.env.MT5_GATEWAY_URL,
      timeoutMs: this.env.MT5_TIMEOUT,
      maxRetry: this.env.MT5_MAX_RETRY,
      heartbeatSeconds: this.env.MT5_HEARTBEAT,
    });

    const errorMapper = new MetaTrader5ErrorMapper();
    const sessionManager = new MetaTrader5SessionManager(client);
    const connectionManager = new MetaTrader5ConnectionManager(client, errorMapper, this.env.MT5_MAX_RETRY, this.env.MT5_RECONNECT);

    // No dedicated `MT5_CACHE_TTL` var was named in BR-001's own
    // Configuration example — reusing the shared Market Data cache TTL
    // base (same convention `metatrader5.constants.ts`'s own doc comment
    // documents) rather than inventing an unrequested new env var.
    const baseCacheTtlMs = this.env.MARKET_DATA_CACHE_TTL_MS;

    const accountService = new MetaTrader5AccountService(client, this.cache, baseCacheTtlMs);
    const symbolService = new MetaTrader5SymbolService(client, this.cache, baseCacheTtlMs);
    const marketService = new MetaTrader5MarketService(client);
    const orderService = new MetaTrader5OrderService(client);
    const positionService = new MetaTrader5PositionService(client);
    const historyService = new MetaTrader5HistoryService(client);
    const streamingService = new MetaTrader5StreamingService(this.env.MT5_GATEWAY_URL);
    const riskService = new MetaTrader5RiskService(client);
    const healthProvider = new MetaTrader5HealthProvider(client, sessionManager, errorMapper);

    return new MetaTrader5Provider(
      this.env.MT5_ENABLED,
      errorMapper,
      healthProvider,
      accountService,
      symbolService,
      marketService,
      orderService,
      positionService,
      historyService,
      streamingService,
      riskService,
      sessionManager,
      connectionManager,
    );
  }
}
