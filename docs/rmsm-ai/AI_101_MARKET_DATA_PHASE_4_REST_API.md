# AI-101 — Phase 4: REST API Layer

Status: Complete — Awaiting Architecture Review Before Phase 5

8 controllers, 24 endpoints, exposing everything Phases 2A–3 built — the first phase where
AI-101 is actually reachable over HTTP.

## Phase Completion Report

### Implemented Endpoints

24 endpoints across 8 controllers (`ExchangeController`, `InstrumentController`,
`MarketCandleController`, `MarketQuoteController`, `MarketTickController`,
`CorporateActionController`, `ProviderConfigController`, `SynchronizationController`) — full
list with permissions in `docs/rmsm-ai/AI_101_API_ENDPOINTS.md`. Naming follows the exact
resource convention specified (`/market-data/exchanges`, `/market-data/instruments`,
`/market-data/candles`, `/market-data/quotes`, `/market-data/ticks`,
`/market-data/corporate-actions`, `/market-data/providers`, `/market-data/synchronizations`).

### The Necessary-Plumbing Question, Resolved Concretely

Phase 4 forbids "new business logic" but also mandates "controllers must never communicate
directly with repositories — everything flows through the AI-101 service layer." These two
rules collided immediately: `MarketDataService` (Phase 3) had zero methods for `Exchange` or
`MarketTick` data at all. Resolved by adding exactly the thin pass-through methods needed
(`getExchange`, `getExchangeByCode`, `listExchanges`, `searchExchanges`, `getTicks`) — no new
decisions, no new orchestration, just the service-layer surface the layering rule requires to
exist. A new `MarketDataAdminService` was added for the same reason, covering provider-config
and import-job read access no Phase 3 service exposed (a deliberate split from
`MarketDataService` — different audience, matching EP-005's own
`NotificationService`/`AdminNotificationController` separation).

### 5 Real Capability Gaps, Found and Documented, Not Worked Around

Building strictly on Phase 2A's existing repositories (no repository changes allowed this
phase) surfaced 5 places where a requested capability has no backing repository method — listed
in full as ADR-030, with each one documented again at its exact call site:

1. **Historical quotes** — `MarketQuoteRepository` has no date-range query. Endpoint not built.
2. **Instrument-by-exchange filtering** — `InstrumentRepository.search()` has no exchangeId
   filter. In-memory post-filtering was considered and rejected: filtering results *after* a
   paginated database query would silently corrupt the pagination contract (a page could return
   fewer than `pageSize` rows, or the reported `totalCount` could disagree with what's
   actually filterable) — worse than not filtering at all.
3. **Corporate-action filtering/search beyond instrumentId** — the repository only has
   `findByInstrument()`.
4. **Cursor pagination** — every repository list method is offset/skip-based; no keyset
   support exists to build true cursor pagination on top of.
5. **"Recent" failed-import health** — `DataImportJobRepository.findByStatus()` has no time
   bound, so the health check reports an all-time failed-import count, not a rolling window.
   Named explicitly in the response field (`totalFailedImportCount`, not `recentFailedImportCount`
   — an earlier draft used the misleading name and was caught and corrected during this
   phase's own writing).

### Architectural Decisions

- **No `OrganizationRoleGuard` anywhere in this module's controllers** — `PermissionsGuard`
  alone, consistent with ADR-021 (no `organizationId` in AI-101) and EP-005's
  `AdminNotificationController` precedent for platform-wide, non-org-scoped resources.
- **2 new permission keys**: `market-data.read` (granted broadly, even `FREE_USER` — browsing
  market data is a core, low-stakes feature) and `market-data.admin.manage` (`ADMIN`/
  `SUPER_ADMIN` only, matching `notification.admin.manage`'s tier — provider config and
  synchronization status are operational visibility, not for every account).
- **Error handling reuses existing infrastructure** — `GlobalExceptionFilter`
  (`apps/api/src/common/filters/`) already maps `AppError` subclasses (`NotFoundError`,
  `ValidationError`, etc.) to correct HTTP statuses. No new error-handling code was needed;
  services just had to throw the right `@rmsm/shared` exception types, which they already did.
- **`MarketDataValidationError` (Phase 2C, ADR-027) never crosses the service→controller
  boundary** — checked, not assumed: `HistoricalImportService` already catches every candle
  validation failure internally and converts it to a `DataQualityIssue` row rather than
  re-throwing (Phase 3's design). No Phase 4 controller calls a Phase 2C validator directly.
  Worth re-checking if a future phase adds a write endpoint that validates caller-supplied data
  directly.
- **`CandleQueryDto` extended, not replaced** — `instrumentId` became optional, with an
  `exchangeId`+`symbol` alternative resolved via `MarketDataService.getInstrumentByExchangeAndSymbol`
  (built in Phase 3). `ValidateIf` handles per-field conditional requirements; the "at least one
  complete identification method was given" check lives in the controller, since class-validator
  has no native "exactly one of these two field groups" constraint.

### Security Considerations

- Provider configuration responses are **structurally** incapable of carrying
  `credentialReference` — `ProviderConfigResponseDto` has no such field, not merely an omission
  at serialization time that a future edit could accidentally reverse.
- Every endpoint requires authentication (`ApiBearerAuth`) and a specific permission
  (`RequirePermissions`) — none are public.
- No write endpoints exist this phase (REST layer is read/admin-report only), so no new
  mutation attack surface was introduced.

### Validation Checklist

- [x] Controllers remain thin — verified by direct code review; every controller method is a
      single delegation to a service call, with the one real branch
      (`MarketCandleController`'s instrumentId-vs-symbol resolution) kept in the controller
      only because it's request-shape disambiguation, not business logic
- [x] Zero controllers import a repository — verified by a direct grep for
      `^import.*Repository`, not just visual inspection
- [x] Response DTOs never expose Prisma models — every response type is a hand-written DTO
      class or a Phase 2A domain-model interface (ADR-025), never a raw Prisma row
- [x] Every endpoint has `@ApiOperation` + `@ApiOkResponse` + a named DTO
- [x] `pnpm lint` 0 errors, `pnpm typecheck` 0 errors (verified against extended stub; zero
      errors on the first attempt despite this being the largest single phase in AI-101 so far)
- [x] 21 new test cases across 4 new spec files, all genuinely executed
- [x] Full suite: 36/36 suites, 232/232 tests
- [x] TODO/placeholder/bare-`any` scan: none found

### Phase 5 Prerequisites

Genuine open questions for the next phase, not implementation blockers:
1. Should the 5 capability gaps (ADR-030) be resolved via a Phase 2A repository revisit before
   Phase 5, or deferred further?
2. Is API integration testing (full HTTP request/response cycle) worth its own phase, or folded
   into whatever Phase 5 turns out to be?
3. Confirm whether write endpoints (triggering a historical import via REST, rather than only
   through direct service calls) belong in a future REST phase or remain
   service-layer-only indefinitely.

## Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors, first attempt |
| Zero-repository-import scan | ✅ confirmed via direct grep |
| New tests (21 cases across 4 files) | ✅ genuinely executed and passing |
| Full suite | ✅ 36/36 suites, 232/232 tests |
| TODO/placeholder/bare-`any` scan | ✅ none found |

---

**Awaiting architecture review before Phase 5, per your explicit instruction — not proceeding
further.**
