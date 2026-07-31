/**
 * The Broker Integration domain's own vocabulary — deliberately NOT
 * imported from `../market-data/contracts` or any market-data interface.
 * BR-001's own "IMPORTANT IMPLEMENTATION NOTE" requires a strict
 * separation between the Market Data domain (Twelve Data, CoinGecko,
 * Alpha Vantage, Yahoo Finance — MD-001..004) and the Broker Integration
 * domain (MetaTrader 5 — this module, first of a roadmap that also
 * includes Angel One SmartAPI, Interactive Brokers, cTrader, FIX API).
 * A shared vocabulary would be convenient, but it would also tie any
 * future broker-domain evolution to whatever market-data's status/error
 * types happen to look like — the opposite of the reusable,
 * broker-agnostic abstraction BR-001 asks for. Every type below is
 * broker-domain-native, even where it happens to look similar to its
 * market-data counterpart.
 */

/** BR-001 implements METATRADER5; the remaining four are the module's own documented roadmap, declared here so `BrokerRegistryService`'s `Map<BrokerType, BrokerProvider>` has a real, closed union to key on from day one rather than a bare `string`. */
export type BrokerType = "METATRADER5" | "ANGEL_ONE" | "INTERACTIVE_BROKERS" | "CTRADER" | "FIX_API";

export type BrokerHealthStatus = "healthy" | "degraded" | "down" | "unknown";

/** BR-001's own Error Handling section names exactly these nine categories — used verbatim as this domain's error taxonomy, the same "the prompt's own list becomes the enum" approach MD-003 used for Alpha Vantage. */
export type BrokerErrorClassification =
  | "connection_failed"
  | "login_failed"
  | "invalid_credentials"
  | "timeout"
  | "order_rejected"
  | "symbol_not_found"
  | "broker_offline"
  | "session_expired"
  | "network_error"
  | "unknown";

/** BR-001's own Supported Timeframes list, verbatim. */
export type BrokerTimeframe = "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1" | "W1" | "MN1";

/** BR-001's own Order Service list, verbatim. */
export type BrokerOrderType = "MARKET_BUY" | "MARKET_SELL" | "BUY_LIMIT" | "SELL_LIMIT" | "BUY_STOP" | "SELL_STOP";

export type BrokerOrderStatus = "PENDING" | "FILLED" | "PARTIALLY_FILLED" | "MODIFIED" | "CANCELLED" | "REJECTED" | "EXPIRED";

export type BrokerPositionSide = "BUY" | "SELL";

export type BrokerConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING" | "FAILED";
