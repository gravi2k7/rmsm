# AI-101 — Phase 3: Service Layer & Synchronization Orchestration

Status: Complete — Awaiting Approval Before Next Phase

Five services, composing Phase 2A's repositories, Phase 2B's provider infrastructure, and
Phase 2C's normalization/validation layer into real, callable operations for the first time —
this is the phase where those three previous phases' pieces actually run together.

## 1. What Was Built

| Service | Role |
|---|---|
| `MarketDataService` | Read-side API — the actual "single source of truth" surface future AI-10x engines consume. No provider dependency; reading persisted data never needs one. |
| `HistoricalImportService` | Write-side orchestrator: fetch (with retry) → validate → deduplicate → persist, atomically, with audit and metrics. |
| `SynchronizationService` | Sync *decision* logic — "does this instrument need a sync, for what range" — with zero scheduler/cron of its own. |
| `ProviderOrchestrationService` | Centralized retry + rate-limit policy application, shared by any service calling a provider. |
| `MarketDataMetricsService` | In-memory counters, honestly scoped (same pattern as Module 005's equivalent — real hooks, not a production monitoring backend). |

## 2. The Orchestration/Scheduler Boundary, Made Concrete

"Background schedulers beyond orchestration" excluded this phase raised a real question: what
counts as orchestration versus scheduling? Resolved concretely (ADR-029): retrying a call
that's already in flight — `ProviderOrchestrationService`'s exponential backoff, synchronous
within one method call — is orchestration. Deciding *when* to next attempt a sync that hasn't
started yet is scheduling, and that remains genuinely absent: `SynchronizationService` has no
timer, no cron registration, no queue. `synchronizeInstrument()` is a plain method a caller
invokes once; a future phase's actual scheduler calls it periodically, the same separation
Module 005's `NotificationScheduler` established between decision logic and trigger wiring.

## 3. Transaction Boundaries

`HistoricalImportService.importHistoricalCandles()` writes every candle in a batch plus the
parent `DataImportJob`'s final status atomically, via `prisma.$transaction`. This matters
concretely: without it, a crash mid-batch could leave some candles persisted while the job
stays `RUNNING` forever, with no way for a caller to know whether the import actually finished.
Data-quality-issue rows (for rejected candles) are written outside the main transaction
deliberately — they're diagnostic records about *rejected* data, not part of the successful
persist path, so their durability doesn't need to be coupled to it.

## 4. Retry Policy, Applied for Real

Every provider call in `HistoricalImportService` goes through
`ProviderOrchestrationService.executeWithRetry()`, which: waits for
`provider.rateLimitPolicy.getWaitTimeMs()` before calling, classifies any failure via
`provider.errorMapper.classify()`, retries only if `isRetryable()` says so (exponential
backoff, capped attempts), and records every outcome to
`MarketDataMetricsService`. Provider-agnostic throughout — this service never references a
specific `MarketDataProviderType` in its logic, only via whatever type the caller's resolved
provider config carries, the same rule every prior phase's architecture section restated.

## 5. Audit Hooks — Finally Wired In For Real

Phase 1's "Enterprise Platform Integration" section named `AuditService` reuse as a future
requirement; this is the first phase with real service-layer mutations to audit.
`HistoricalImportService` logs `market_data.historical_import.completed` and
`.failed`, `userId: actorId` — `null` for system-initiated imports (a future scheduler calling
this with no real user behind it), never a fake string, the same discipline this project has
now applied consistently since catching and fixing the opposite mistake twice in earlier
modules.

## 6. Metrics Hooks

`MarketDataMetricsService` — the same honestly-scoped pattern as Module 005's
`NotificationMetricsService`: real counters (`provider.<type>.retry_attempted`,
`.retry_succeeded`, `.call_failed`, `import.<type>.candles_persisted`, `.candles_rejected`,
`.failed`), incremented from real events, explicitly not presented as production monitoring
infrastructure. In-memory, single-instance, reset on restart — a real backend integration is a
deployment decision for whoever operates this.

## 7. Provider Orchestration, Composed Correctly

`HistoricalImportService` resolves an `Instrument` and a `MarketDataProviderConfig`
independently, then looks up the specific `InstrumentAlias` connecting them — the concrete
mechanism that lets this service pass a resolved `providerSymbol` (never a guessed one, per
ADR-028) into `provider.historicalDataClient.fetchCandles()`. If no alias exists, the import
fails with a clear `NotFoundError` telling the caller to register one first, rather than
guessing or silently skipping.

## 8. Service Unit Tests

22 new tests across 4 spec files, all genuinely executed (confirmed against the runtime-stub
technique, with visible retry-warning log output in the actual test run proving the retry loop
executed for real, not through a mocked-away shortcut):

- `provider-orchestration.service.spec.ts` (6 cases) — success, rate-limit wait, retry-then-
  succeed, non-retryable immediate failure, retries-exhausted failure, `recordCall()` on both
  outcomes
- `synchronization.service.spec.ts` (5 cases) — up-to-date short-circuit, stale-triggers-import,
  no-prior-data-backfills-default-window, actorId pass-through
- `historical-import.service.spec.ts` (8 cases) — missing instrument/alias, successful persist
  with audit+metrics, invalid-candle-becomes-quality-issue-not-a-row, in-batch deduplication,
  provider-failure marks job failed and audits, real `prisma.$transaction` invocation confirmed
- `market-data.service.spec.ts` (5 cases) — not-found handling across every read method,
  alias-resolution delegation

## 9. What Remains Explicitly Out of Scope

Per this phase's own exclusion list, confirmed not built: REST controllers, GraphQL, WebSockets,
live provider SDK implementations (still only `InternalFeedProvider`, Phase 2B's reference
provider), actual scheduler/queue registration beyond the orchestration logic described above,
UI, and anything belonging to whatever the next numbered phase turns out to be.

## 10. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors, first attempt — despite this phase's services being the most complex composition in AI-101 so far |
| New service tests (22 cases) | ✅ Genuinely executed and passing, confirmed via visible retry-log output in the actual run |
| Full suite | ✅ 32/32 suites, 207/207 tests |
| TODO/placeholder/bare-`any` scan | ✅ none found |

---

**Awaiting your review before the next phase.**
