# BR-001 — MetaTrader 5 Global Broker Platform

**Status:** Complete
**Scope:** The first Broker Integration module, built as a brand-new domain independent from the Market Data Foundation (MD-001 Twelve Data, MD-002 CoinGecko, MD-003 Alpha Vantage, MD-004 Yahoo Finance).

---

## Architecture

BR-001 introduces a new `api/src/modules/broker/` domain, structurally parallel to `market-data/` but deliberately **not** coupled to it — no shared registry, no shared error/health vocabulary, no shared interfaces. The Market Data domain's Provider Registry, Provider Factory, and `MarketDataProvider` interface are untouched.

```
api/src/modules/broker/
├── broker.module.ts
├── contracts/
│   └── broker.contracts.ts          # BrokerType, BrokerHealthStatus, BrokerErrorClassification, etc.
├── interfaces/
│   ├── broker-models.ts             # shared broker-agnostic DTOs (BrokerAccountInfo, BrokerQuote, ...)
│   ├── broker-provider.interface.ts # composes every responsibility interface below
│   ├── broker-auth-service.interface.ts
│   ├── broker-account-service.interface.ts
│   ├── broker-symbol-service.interface.ts
│   ├── broker-market-service.interface.ts
│   ├── broker-order-service.interface.ts
│   ├── broker-position-service.interface.ts
│   ├── broker-history-service.interface.ts
│   ├── broker-streaming-service.interface.ts
│   ├── broker-risk-service.interface.ts
│   ├── broker-connection-manager.interface.ts
│   ├── broker-session-manager.interface.ts
│   ├── broker-health-provider.interface.ts
│   └── broker-error-mapper.interface.ts
└── providers/
    ├── broker-registry.service.ts   # Map-based registry, no companion Factory (see below)
    └── metatrader5/
        ├── metatrader5.types.ts             # raw MT5 gateway wire shapes (never exposed outside this folder)
        ├── metatrader5.constants.ts         # timeframes, order types, cache TTL multipliers
        ├── metatrader5.error-mapper.ts       # MetaTrader5ErrorMapper
        ├── metatrader5.cache.ts              # MetaTrader5CacheService (Redis, mt5: prefix)
        ├── metatrader5.client.ts             # MetaTrader5Client (Connect/Login/Ping/Heartbeat/...)
        ├── metatrader5.connection-manager.ts # MetaTrader5ConnectionManager
        ├── metatrader5.session-manager.ts    # MetaTrader5SessionManager
        ├── metatrader5.account.service.ts
        ├── metatrader5.symbol.service.ts
        ├── metatrader5.market.service.ts
        ├── metatrader5.order.service.ts
        ├── metatrader5.position.service.ts
        ├── metatrader5.history.service.ts
        ├── metatrader5.streaming.service.ts
        ├── metatrader5.risk.service.ts
        ├── metatrader5.health.ts             # MetaTrader5HealthProvider
        ├── metatrader5.provider.ts           # MetaTrader5Provider (implements BrokerProvider)
        ├── metatrader5.module.ts             # MetaTrader5RegistrarService
        └── __tests__/                        # 16 spec files
```

`BrokerType` currently has one implementation (`"METATRADER5"`) but is already a union that includes the full roadmap (`"ANGEL_ONE"`, `"INTERACTIVE_BROKERS"`, `"CTRADER"`, `"FIX_API"`) — see **Future Broker Compatibility** below for what adding one of those looks like.

### Why MetaTrader 5 talks to a gateway, not a native API

MetaTrader 5 has no REST/Node-consumable API: MetaQuotes' own Python package only works against a live terminal on the same Windows host (IPC, not network-callable), and the Manager API is a binary broker-operator protocol, not something a regular trading account can use. `MetaTrader5Client` therefore targets a configurable **MT5 gateway/bridge** — a self-hosted companion service or vendor gateway that itself holds the real terminal/Manager-API connection and exposes a plain HTTP+WebSocket contract (fully specified in `metatrader5.types.ts`). `MT5_GATEWAY_URL` points at whichever gateway a deployment runs; nothing in this codebase is hardcoded to a specific vendor's request/response shape. This satisfies BR-001's "Do NOT tightly couple RMSM to MetaTrader" rule at the transport layer, not just the abstraction layer.

---

## Components

| BR-001 responsibility | Implementation |
|---|---|
| Broker interface | `BrokerProvider` (composes Auth/Account/Symbol/Market/Order/Position/History/Streaming/Risk/Health/error-mapping) |
| Provider | `MetaTrader5Provider` |
| Client | `MetaTrader5Client` — Connect/Disconnect/Login/Logout/Reconnect/Connection Status/Ping/Heartbeat |
| Connection Manager | `MetaTrader5ConnectionManager` — Connect/Disconnect/Auto Reconnect/Retry Strategy/Connection Health |
| Session Manager | `MetaTrader5SessionManager` — Login/Logout/Refresh Session/Session Validation/Session Expiration |
| Account Service | `MetaTrader5AccountService` — Account Number/Name/Balance/Equity/Margin/Free Margin/Margin Level/Currency/Leverage |
| Symbol Service | `MetaTrader5SymbolService` — List/Search/Info/Tick Size/Contract Size/Digits/Trading Sessions |
| Market Service | `MetaTrader5MarketService` — Current Price/Bid/Ask/Spread/Tick/Historical Candles/OHLC/Volume, 9 timeframes |
| Order Service | `MetaTrader5OrderService` — Market Buy/Sell, Buy/Sell Limit, Buy/Sell Stop, SL/TP, Modify, Cancel |
| Position Service | `MetaTrader5PositionService` — Open Positions, Position Details, Floating Profit, Swap, Commission |
| History Service | `MetaTrader5HistoryService` — Order History, Deal History, date filtering |
| Streaming Service | `MetaTrader5StreamingService` — Tick/Order/Position/Account updates, event-driven subscriptions |
| Risk Service | `MetaTrader5RiskService` — Margin Calculation, Position Size, Required Margin, Stop Out, Risk Validation |
| Health Provider | `MetaTrader5HealthProvider` — Connected, Session Valid, Ping, Broker Reachable, Terminal Available |
| Cache | `MetaTrader5CacheService` — Symbol List, Symbol Metadata, Account Information, configurable TTL |
| Error Mapper | `MetaTrader5ErrorMapper` — 9 named categories |

"Closed Positions" (BR-001's Position Service list) and "Trade History" are deliberately not separate methods — they are `MetaTrader5HistoryService.getDealHistory()`, which already covers executed/closed trade records; duplicating that as a second method on the Position Service would be the kind of redundant surface BR-001's own "No Duplicate Code" standard warns against.

No dedicated `MetaTrader5Mapper` class exists. Each service does its own small, field-by-field mapping from the MT5 gateway's raw shape (`metatrader5.types.ts`) to the shared `Broker*` DTO (`interfaces/broker-models.ts`) inline — the two shapes are close enough per-service that a separate mapper file would be a thin pass-through with nothing non-trivial in it.

---

## Configuration

Added to `@rmsm/config` (`packages/config/src/schemas/metatrader5.schema.ts`, `packages/config/src/config/metatrader5.config.ts`), wired into `schemas/index.ts`, `config/index.ts`, and `env/env.validator.ts` — exactly as every prior milestone's config extension:

| Variable | Type | Default | Notes |
|---|---|---|---|
| `MT5_ENABLED` | boolean | `false` | Gates `MetaTrader5Provider.enabled` — a deployment can have credentials configured but the broker disabled |
| `MT5_TIMEOUT` | ms | `10000` | Per-gateway-request timeout |
| `MT5_RECONNECT` | boolean | `true` | Whether `autoReconnect()` attempts to reconnect at all |
| `MT5_MAX_RETRY` | int | `5` | Max retry attempts, shared by `MetaTrader5Client.request()` and `MetaTrader5ConnectionManager`'s connect retry |
| `MT5_HEARTBEAT` | seconds | `30` | Heartbeat ping interval |
| `MT5_GATEWAY_URL` | string | `http://localhost:8222` | The gateway/bridge base URL — never a vendor-specific address |
| `MT5_LOGIN` | string, optional | — | Never logged |
| `MT5_PASSWORD` | string, optional | — | Never logged, anywhere, full stop |
| `MT5_SERVER` | string, optional | — | |
| `MT5_TERMINAL_PATH` | string, optional | — | |

No direct `process.env` access anywhere in the broker domain — every value flows through `@rmsm/config`'s `Env` type via the `APP_CONFIG` injection token, matching every prior milestone.

There is no dedicated `MT5_CACHE_TTL` variable — BR-001's own Configuration example does not name one, so `MetaTrader5RegistrarService` reuses the existing `MARKET_DATA_CACHE_TTL_MS` base (same reuse decision MD-002/MD-003 made for their own caches) rather than introducing a var nobody asked for.

---

## Security

- `password` is never passed to a log call anywhere in the broker domain. `MetaTrader5Client.login()` logs `login`/`server`/a masked session id only.
- `MetaTrader5Client.maskSecret()` shows only the first 4 characters of a session id in logs (`sess-1234567890` → `sess************`) — enough to correlate log lines during debugging, never enough to reuse.
- `Mt5BrokerError` (the internal error shape) never carries the `password` that caused a login failure.
- Order details (symbol/type/volume/orderId) ARE logged — BR-001's own Logging section asks for "Orders" to be logged; the "Do NOT log passwords" rule is about credentials specifically, not order activity.
- Risk math (margin, position size, stop-out level) is never computed client-side — every `MetaTrader5RiskService` method delegates to the gateway's own `/risk/*` endpoints, since only the broker has the authoritative account-type/leverage-tier inputs to compute them correctly.

---

## Session Flow

1. `MetaTrader5SessionManager.login(credentials)` → `MetaTrader5Client.login()` → gateway `POST /login` → session id stored, `lastCredentials` retained (never logged) for reconnect/refresh.
2. `isSessionValid()` checks the session's `expiresAt` against the current time — a session with no `expiresAt` is treated as always valid until explicit logout.
3. `refreshSession()` re-calls `login()` with the last-used credentials; if there was never a prior login, it throws an `isSessionExpired` error rather than silently no-op'ing.
4. `logout()` clears both the session and `lastCredentials`.

`BrokerAuthService` (BR-001's top-level "Authentication" capability) and `BrokerSessionManager` (BR-001's "Session Manager" responsibility) describe overlapping login/logout operations from two angles. Rather than implement login/logout twice, `MetaTrader5Provider.authService` is a thin adapter that delegates every call to the one real `MetaTrader5SessionManager` instance the provider also uses internally.

## Connection Flow

1. `MetaTrader5ConnectionManager.connect()` → retries `client.connect()` with exponential backoff (`1s, 2s, 4s, ...`) up to `MT5_MAX_RETRY` attempts, using `MetaTrader5ErrorMapper.isRetryable()` to decide whether a given failure is worth retrying at all (a `login_failed`/`invalid_credentials` failure is not retried; `timeout`/`network_error`/`broker_offline`/`connection_failed` are).
2. `MetaTrader5Client.connect()` itself just pings the gateway — the actual login handshake is a separate step via `SessionManager`.
3. `autoReconnect()` is the entry point a health/heartbeat failure handler would call — when `MT5_RECONNECT=false` it logs and returns immediately rather than fighting a deployment that deliberately wants a dropped connection to stay dropped (e.g. planned maintenance).
4. Two independent retry layers exist by design: `MetaTrader5ConnectionManager` retries "is the connection itself up," while `MetaTrader5Client.request()` separately retries "did this one API call transiently fail" — conflating them would make either concern harder to reason about or configure independently.

---

## Services

Every named BR-001 service is implemented as its own class taking `MetaTrader5Client` (and, for the two cached services, `MetaTrader5CacheService` + a base TTL) as its only dependencies — see the Components table above for the full responsibility-to-file mapping. `MetaTrader5MarketService.getCandles()` validates the requested timeframe against `MT5_TIMEFRAMES` *before* making any network call, the same "honest interval support" pattern used by every Market Data provider since MD-002/MD-003/MD-004.

---

## Testing

17 spec files, 137 tests, covering every item on BR-001's own Tests list:

- `metatrader5.error-mapper.spec.ts` — every classification, priority ordering, HTTP-status fallback, retryability
- `metatrader5.client.spec.ts` — connect/disconnect/login/logout/reconnect/ping/heartbeat, retry/backoff behavior, credential masking, timeout vs. network-error classification
- `metatrader5.session-manager.spec.ts` — login/logout/refresh/validity/expiration
- `metatrader5.connection-manager.spec.ts` — connect retry, non-retryable short-circuit, `autoReconnect()` enabled/disabled via `reconnectEnabled`
- `metatrader5.account.service.spec.ts`, `metatrader5.symbol.service.spec.ts`, `metatrader5.market.service.spec.ts`, `metatrader5.order.service.spec.ts`, `metatrader5.position.service.spec.ts`, `metatrader5.history.service.spec.ts`, `metatrader5.risk.service.spec.ts` — field mapping, caching, timeframe validation, date-range filtering, gateway delegation for risk math
- `metatrader5.streaming.service.spec.ts` — lazy connection, shared-socket multiplexing, per-event-type dispatch, idle disconnect, malformed-event resilience
- `metatrader5.health.spec.ts` — every health/degraded/down/unknown combination, never-throws guarantee
- `metatrader5.cache.spec.ts` — cache-aside hit/miss, `mt5:` key prefix, `invalidate()`, Redis-unavailable fallback
- `metatrader5.module.spec.ts` — registrar registration, disabled-but-present registration, no eager connect/login on boot, Registry-only (no Factory) registration
- `metatrader5.provider.spec.ts` — metadata/capability flags, `enabled` gating, `authService` delegation, sub-service composition
- `broker-registry.service.spec.ts` — register/get/tryGet/listEnabled/getMetadata, enabled-vs-disabled `get()` behavior

Full regression after this change: **44 test suites, 391 tests, all passing** (17 broker + 27 pre-existing Market Data suites from MD-001–MD-004).

### Typecheck note

While verifying this milestone, the sandbox `tsc --strict` configuration was brought in line with the real repository's `tsconfig.base.json`, which additionally sets `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, and `noFallthroughCasesInSwitch` — flags the prior MD-001–MD-004 verification passes did not exercise. Under the corrected configuration, the entire Broker domain (this milestone) typechecks with **zero errors**. The stricter flags did surface a small number of pre-existing issues in already-delivered Market Data files (an unused `logger` field in three `*.module.ts` registrars, a few `noUncheckedIndexedAccess` narrowings in rate-limiters/mappers, and two `HeadersInit` typing issues in `yahoo-finance.client.ts`). Per BR-001's explicit "Do NOT modify existing Market Data modules" rule, none of these were touched as part of this milestone — they are flagged here as a follow-up for whichever future milestone owns Market Data maintenance.

---

## Known Limitations

- **No Prisma/database layer.** BR-001 named no broker-config table or migration in its own deliverables list; account/session state is held in-memory in `MetaTrader5Client`/`MetaTrader5SessionManager` for the lifetime of the process.
- **No dedicated MT5 gateway service is shipped.** `MetaTrader5Client` implements the *consumer* side of a gateway contract (fully specified in `metatrader5.types.ts`); an actual gateway/bridge process (self-hosted or vendor) must be run separately and pointed at via `MT5_GATEWAY_URL`.
- **Symbol search is client-side.** `MetaTrader5SymbolService.searchSymbols()` filters the cached full symbol list rather than calling a dedicated search endpoint, since MT5 gateways typically expose bulk listing but not free-text search — reimplementing per-vendor search would itself be a form of vendor coupling.
- **Risk math is fully gateway-delegated**, so `MetaTrader5RiskService` has no client-side fallback if the gateway's `/risk/*` endpoints are unavailable — this is intentional (see Security section) but means risk features have a hard dependency on gateway health.
- **No dedicated `packages/config` unit-test file** was added for `metatrader5.schema.ts` — consistent with MD-001 through MD-004, which also validate their config only indirectly (via each provider's own registrar spec, e.g. `metatrader5.module.spec.ts` here), since no `packages/config` test runner is currently wired up in this repository.

---

## Future Broker Compatibility

Adding a second broker (Angel One SmartAPI, Interactive Brokers, cTrader, FIX API) requires no change to any file in this delivery:

1. Add that broker's own `providers/<broker>/` directory implementing the same 14 `Broker*Service`/`Broker*Manager` interfaces this delivery already defines in `interfaces/`.
2. Add one entry to `BrokerType` (`contracts/broker.contracts.ts`).
3. Add that broker's own `<broker>RegistrarService`, following `MetaTrader5RegistrarService`'s exact pattern (build the object graph, call `registry.register(provider)` in `onModuleInit()` — no Factory).
4. Add that broker's own cache service + registrar to `broker.module.ts`'s `providers` array — one more line, no restructuring.
5. Add that broker's own env vars to `@rmsm/config`, following `metatrader5.schema.ts`'s pattern.

`BrokerRegistryService`, every interface in `interfaces/`, and `broker.module.ts`'s overall shape are all broker-count-agnostic by design — none of them reference `MetaTrader5*` by name.
