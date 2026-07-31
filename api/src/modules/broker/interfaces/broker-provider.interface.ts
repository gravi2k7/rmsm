import type { BrokerType } from "../contracts/broker.contracts";
import type { BrokerMetadata } from "./broker-models";
import type { BrokerAuthService } from "./broker-auth-service.interface";
import type { BrokerAccountService } from "./broker-account-service.interface";
import type { BrokerSymbolService } from "./broker-symbol-service.interface";
import type { BrokerMarketService } from "./broker-market-service.interface";
import type { BrokerOrderService } from "./broker-order-service.interface";
import type { BrokerPositionService } from "./broker-position-service.interface";
import type { BrokerHistoryService } from "./broker-history-service.interface";
import type { BrokerStreamingService } from "./broker-streaming-service.interface";
import type { BrokerRiskService } from "./broker-risk-service.interface";
import type { BrokerHealthProvider } from "./broker-health-provider.interface";
import type { BrokerErrorMapper } from "./broker-error-mapper.interface";

/**
 * The common Broker Integration abstraction BR-001 asks for — MetaTrader
 * 5 is the first (and, per the roadmap, not the last) implementation.
 * Every future broker (Angel One SmartAPI, Interactive Brokers, cTrader,
 * FIX API) implements this exact interface and needs no change to
 * anything in this file, `BrokerRegistryService`, or any consumer that
 * only depends on `BrokerProvider` — the same "implement the interface,
 * register, done" discipline `MarketDataProvider` established for
 * MD-001..004, reapplied to a genuinely different domain rather than
 * reused from it (see this module's `contracts/broker.contracts.ts` for
 * why the vocabularies are independent, not shared).
 *
 * Every sub-service is required (not optional, unlike
 * `MarketDataProvider`'s capability-flagged optional clients) — BR-001
 * lists all ten responsibility areas (Authentication, Account, Orders,
 * Positions, History, Streaming, Symbols, Market Data, Health, Risk) as
 * things "MetaTrader 5 must implement," with no capability-negotiation
 * language the way MD's `supportsHistorical`/`supportsQuotes` flags
 * exist for market-data providers with genuinely partial capability. A
 * broker that cannot support one of these ten areas is expected to throw
 * a clear "unsupported" error from that specific method rather than
 * from a missing optional property.
 */
export interface BrokerProvider {
  readonly type: BrokerType;
  readonly enabled: boolean;
  readonly metadata: BrokerMetadata;

  readonly authService: BrokerAuthService;
  readonly accountService: BrokerAccountService;
  readonly symbolService: BrokerSymbolService;
  readonly marketService: BrokerMarketService;
  readonly orderService: BrokerOrderService;
  readonly positionService: BrokerPositionService;
  readonly historyService: BrokerHistoryService;
  readonly streamingService: BrokerStreamingService;
  readonly riskService: BrokerRiskService;
  readonly healthProvider: BrokerHealthProvider;
  readonly errorMapper: BrokerErrorMapper;
}
