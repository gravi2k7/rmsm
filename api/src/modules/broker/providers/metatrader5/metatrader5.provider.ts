import type { BrokerType } from "../../contracts/broker.contracts";
import type { BrokerProvider } from "../../interfaces/broker-provider.interface";
import type { BrokerMetadata } from "../../interfaces/broker-models";
import { MetaTrader5ErrorMapper } from "./metatrader5.error-mapper";
import { MetaTrader5HealthProvider } from "./metatrader5.health";
import { MetaTrader5AccountService } from "./metatrader5.account.service";
import { MetaTrader5SymbolService } from "./metatrader5.symbol.service";
import { MetaTrader5MarketService } from "./metatrader5.market.service";
import { MetaTrader5OrderService } from "./metatrader5.order.service";
import { MetaTrader5PositionService } from "./metatrader5.position.service";
import { MetaTrader5HistoryService } from "./metatrader5.history.service";
import { MetaTrader5StreamingService } from "./metatrader5.streaming.service";
import { MetaTrader5RiskService } from "./metatrader5.risk.service";
import { MT5_TIMEFRAMES } from "./metatrader5.constants";
import type { BrokerAuthService } from "../../interfaces/broker-auth-service.interface";
import type { BrokerCredentials, BrokerSession } from "../../interfaces/broker-models";
import { MetaTrader5SessionManager } from "./metatrader5.session-manager";
import { MetaTrader5ConnectionManager } from "./metatrader5.connection-manager";

/**
 * MetaTrader 5 — BR-001's first `BrokerProvider` implementation. Every
 * sub-service is a thin, independently-testable class wired together
 * here; this file's own job is composition, not logic (mirrors how
 * every `*Provider` class in the Market Data domain composes its own
 * client/mapper/cache rather than containing feature logic itself).
 *
 * `authService` is a small adapter over `MetaTrader5SessionManager` —
 * `BrokerAuthService` (BR-001's "Authentication" responsibility) and
 * `BrokerSessionManager` (BR-001's "Session Manager" responsibility)
 * describe overlapping operations (login/logout) from two different
 * angles: one is "what BR-001 says every broker must expose as part of
 * its top-level `BrokerProvider` capability set," the other is "how
 * MetaTrader5 specifically manages that state internally, including
 * refresh/expiration." Rather than duplicate the login/logout logic
 * across two real implementations, `authService` delegates to the one
 * real `MetaTrader5SessionManager` this provider also uses internally
 * (e.g. from `MetaTrader5ConnectionManager.autoReconnect()`).
 *
 * Connecting/logging in is NOT performed eagerly during construction or
 * registration — see `MetaTrader5RegistrarService`'s own doc comment for
 * why.
 */
export class MetaTrader5Provider implements BrokerProvider {
  readonly type: BrokerType = "METATRADER5";
  readonly metadata: BrokerMetadata;
  readonly authService: BrokerAuthService;

  constructor(
    private readonly enabledFlag: boolean,
    readonly errorMapper: MetaTrader5ErrorMapper,
    readonly healthProvider: MetaTrader5HealthProvider,
    readonly accountService: MetaTrader5AccountService,
    readonly symbolService: MetaTrader5SymbolService,
    readonly marketService: MetaTrader5MarketService,
    readonly orderService: MetaTrader5OrderService,
    readonly positionService: MetaTrader5PositionService,
    readonly historyService: MetaTrader5HistoryService,
    readonly streamingService: MetaTrader5StreamingService,
    readonly riskService: MetaTrader5RiskService,
    private readonly sessionManager: MetaTrader5SessionManager,
    readonly connectionManager: MetaTrader5ConnectionManager,
  ) {
    this.metadata = {
      name: "MetaTrader 5",
      version: "1.0.0",
      brokerType: "METATRADER5",
      supportsStreaming: true,
      supportsOrderExecution: true,
      supportsPositions: true,
      supportsHistory: true,
      supportsRiskManagement: true,
      healthStatus: "unknown",
    };

    this.authService = {
      login: (credentials: BrokerCredentials): Promise<BrokerSession> => this.sessionManager.login(credentials),
      logout: (): Promise<void> => this.sessionManager.logout(),
      isAuthenticated: (): boolean => this.sessionManager.isSessionValid(),
      getSession: (): BrokerSession | undefined => this.sessionManager.getSession(),
    };
  }

  /** Driven by `MT5_ENABLED` (BR-001's own Configuration example), not by credential presence — a deployment may have `MT5_LOGIN`/`MT5_PASSWORD` configured but still want the broker disabled (e.g. during a maintenance window), matching Yahoo Finance's (MD-004) same config-flag-gated convention rather than Twelve Data/Alpha Vantage's key-presence-gated one; a broker connection is a much heavier, stateful thing to have "just work" from credential presence alone. */
  get enabled(): boolean {
    return this.enabledFlag;
  }

  /** Every `CandleInterval`-equivalent this provider genuinely supports — BR-001's own Supported Timeframes list. Exposed for callers that want to validate a timeframe before calling `marketService.getCandles()`. */
  get supportedTimeframes(): readonly string[] {
    return MT5_TIMEFRAMES;
  }
}
