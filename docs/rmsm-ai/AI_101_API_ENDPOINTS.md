# AI-101 — API Endpoints

All endpoints require a valid JWT (`ApiBearerAuth`) and the stated permission. None are
organization-scoped (ADR-021: AI-101 has no `organizationId` anywhere) — gated by
`PermissionsGuard` alone, not `OrganizationRoleGuard`.

Every list endpoint returns the standard `ApiResponse<T>` envelope
(`{ success, data, error, meta }`, via the existing global exception filter / response
interceptor); paginated endpoints wrap `data` in `{ data, pagination }`.

## Exchanges

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/market-data/exchanges` | `market-data.read` | All active exchanges |
| GET | `/market-data/exchanges/search?q=` | `market-data.read` | In-memory filter over `listActive()` (ADR-030-adjacent scaling note — real for a small reference table) |
| GET | `/market-data/exchanges/:id` | `market-data.read` | |

## Instruments

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/market-data/instruments?query=&assetClass=&status=&page=&pageSize=` | `market-data.read` | **`exchangeId` filtering not applied** — see ADR-030 |
| GET | `/market-data/instruments/:id` | `market-data.read` | |

## Candles

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/market-data/candles?instrumentId=\|(exchangeId=&symbol=)&interval=&from=&to=&limit=` | `market-data.read` | Excludes superseded correction rows (ADR-022) — always current value |

## Quotes

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/market-data/quotes?instrumentIds=` | `market-data.read` | Latest quote for up to 100 instruments |
| GET | `/market-data/quotes/:instrumentId` | `market-data.read` | Latest quote for one instrument. **Historical quotes not implemented** — see ADR-030 |

## Ticks

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/market-data/ticks?instrumentId=&from=&to=&limit=` | `market-data.read` | |

## Corporate Actions

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/market-data/corporate-actions?instrumentId=` | `market-data.read` | **Filter/search beyond instrumentId not implemented** — see ADR-030 |

## Providers

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/market-data/providers` | `market-data.admin.manage` | Read-only; `credentialReference` never included (structurally absent from the response DTO, not just omitted at serialization) |
| GET | `/market-data/providers/:id` | `market-data.admin.manage` | |

## Synchronization (administrative — reports on activity, never triggers any)

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/market-data/synchronizations/health` | `market-data.admin.manage` | All-time failed-import count (see ADR-030), plus (Phase 5) per-provider circuit-breaker state and a direct database connectivity check |
| GET | `/market-data/synchronizations/metrics` | `market-data.admin.manage` | `MarketDataMetricsService` snapshot — single-instance, in-memory |
| GET | `/market-data/synchronizations/import-jobs?status=` | `market-data.admin.manage` | Defaults to `status=RUNNING` when omitted (no "list all" repository method — see ADR-030) |
| GET | `/market-data/synchronizations/import-jobs/:id` | `market-data.admin.manage` | |

## Error Responses

Every endpoint can return, via the existing `GlobalExceptionFilter` (pre-existing
infrastructure, reused not rebuilt this phase):

| Status | Thrown by | Trigger |
|---|---|---|
| 400 Bad Request | `class-validator` pipe, or `BadRequestException` | Invalid query params; candle query with neither `instrumentId` nor a complete `exchangeId`+`symbol` pair |
| 401 Unauthorized | JWT guard | Missing/invalid token |
| 403 Forbidden | `PermissionsGuard` | Valid token, missing the required permission |
| 404 Not Found | `NotFoundError` (`@rmsm/shared`) | Exchange/instrument/quote/provider config/import job doesn't exist |
| 500 Internal Error | Uncaught exception | Anything not classified above |

**Not currently reachable through this module's endpoints**: 409 Conflict, 503 Provider
Unavailable — named in Phase 4's own error-handling example list, but nothing in this phase's
read-only surface has a conflict or provider-availability failure mode to trigger them. Both
remain supported by the underlying `AppError`/`GlobalExceptionFilter` infrastructure the moment
a future write endpoint needs them.
