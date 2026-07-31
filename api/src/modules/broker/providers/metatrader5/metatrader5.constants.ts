import type { BrokerTimeframe, BrokerOrderType } from "../../contracts/broker.contracts";

/** BR-001's own Supported Timeframes list — MT5's own timeframe codes are already identical to RMSM's `BrokerTimeframe` values (both use the MetaTrader convention), so this is an identity map kept explicit (not skipped) so `toMt5Timeframe()`/`fromMt5Timeframe()` in metatrader5.market.service.ts have one obvious place to change if a future gateway implementation ever uses different codes. */
export const MT5_TIMEFRAMES: readonly BrokerTimeframe[] = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN1"];

/** BR-001's own Order Service list — MT5's native order-type vocabulary, used as the wire value sent to the gateway. */
export const MT5_ORDER_TYPES: readonly BrokerOrderType[] = ["MARKET_BUY", "MARKET_SELL", "BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP"];

export const MT5_DEFAULT_TIMEOUT_MS = 10_000;
export const MT5_DEFAULT_MAX_RETRY = 5;
export const MT5_DEFAULT_HEARTBEAT_SECONDS = 30;
export const MT5_DEFAULT_RETRY_DELAY_MS = 1_000;

/** The symbol every MT5 demo/live server carries — the cheapest, most reliably-populated probe available, used only by `MetaTrader5HealthProvider`. */
export const MT5_HEALTH_CHECK_SYMBOL = "EURUSD";

/**
 * "Cache: Symbol List, Symbol Metadata, Account Information. TTL
 * configurable." (BR-001's own Cache section) — same base-TTL-plus-
 * per-category-multiplier design as every provider's cache since MD-003.
 * There is no dedicated `MT5_CACHE_TTL` env var in BR-001's named
 * Configuration list, so this reuses the existing shared
 * `MARKET_DATA_CACHE_TTL_MS` base (same reuse-what-already-exists
 * decision MD-002/MD-003 made for their own caches) rather than
 * introducing a new base TTL var BR-001 never asked for.
 */
export const MT5_SYMBOL_LIST_TTL_MULTIPLIER = 12;
export const MT5_SYMBOL_INFO_TTL_MULTIPLIER = 12;
export const MT5_ACCOUNT_INFO_TTL_MULTIPLIER = 1;
