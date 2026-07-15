# AI-102 — Phase 4: REST API & External Interfaces

Status: Complete — Awaiting Architecture Review Before Phase 5

AI-102 is reachable over HTTP for the first time — `IndicatorController`, the only controller in
this module, communicating exclusively with `IndicatorEngineServiceImpl` (Phase 3), exactly as
this phase's own mandatory architecture rule requires.

## A Real Platform-Wide Asymmetry, Found and Documented Rather Than Silently Deviated From

The "Additional Enterprise Recommendation" asks for a "standard response envelope for every
endpoint." Checking the actual codebase before building anything: **no global response-wrapping
interceptor exists anywhere in this platform** — only `LoggingInterceptor` is globally applied.
Every existing controller (AI-101's own Phase 4 included) returns raw DTO data on success; only
ERROR responses get the `{success, data, error, meta}` envelope, via `GlobalExceptionFilter`.

Two options existed: make AI-102 the first module to wrap success responses too (breaking
consistency with every earlier module's own endpoints), or follow the same convention everyone
else already uses. Chosen: **follow the existing convention** — raw success responses,
enveloped errors — for consistency, and name the asymmetry explicitly in
`AI102_REST_API.md` rather than silently deviate or silently pretend the recommendation was
fully satisfied. A genuine cross-cutting decision (should EVERY module's success responses be
enveloped too?) belongs to a platform-wide review, not one module's REST layer quietly deciding
unilaterally.

## Architecture Decisions

### A dedicated, module-scoped exception filter, not a platform-wide change
`GlobalExceptionFilter` only recognizes `@rmsm/shared`'s `AppError` — none of AI-102's 5 internal
error hierarchies (`IndicatorValidationError`, `RegistryValidationError`, `ExecutionError`,
`GraphError`, `ServiceError`) extend it, so they'd all fall through to a generic 500. Resolved
with `IndicatorExceptionFilter` (`@UseFilters()`, scoped to `IndicatorController` only) rather
than modifying the shared platform filter — these 5 hierarchies are AI-102's own internal
taxonomy, not something the rest of the platform needs to know about.

### Error-code-based mapping, not a 30-class instanceof chain
Every error class across all 5 hierarchies already carries a real `code: string` field (each
hierarchy's own base class requires it). `IndicatorExceptionFilter.mapStatus()` switches on
that code rather than an instanceof check per concrete class — exhaustive and maintainable
without enumerating ~30 classes by name.

| Code pattern | HTTP status |
|---|---|
| `IndicatorNotFound`, `DependencyNotFound` | 404 |
| `DuplicateDefinition` | 409 |
| `RegistryService`, `PlannerService` (lower-layer wrappers) | 500 |
| Everything else in these 5 hierarchies | 422 (semantically invalid input/state — 400 is reserved for `ValidationPipe`'s own DTO-syntax failures, which never reach AI-102's own code at all) |

### A real, serious routing bug found and fixed during this phase's own review — not caught by lint or typecheck
`@Get("health")` was originally declared AFTER `@Get(":identifier")` in the controller's method
order. NestJS/Express match routes in registration order, and `"health"` is a syntactically
valid value for the `:identifier` path parameter — meaning `GET /indicators/health` would have
been silently swallowed by the metadata-lookup route in production, never reaching the real
health handler at all. Neither `pnpm lint` nor `pnpm typecheck` catches this class of bug (both
passed cleanly with the bug still present); it was found by manually tracing the controller's
own declared route order while writing `AI102_REST_API.md`'s route-ordering documentation, not
by any automated check. Fixed by moving `health` immediately after `categories` (both static,
single-segment paths, both safely ahead of the dynamic `:identifier` routes) — and a permanent
regression test now reads the controller's own source file and asserts `health`'s declaration
index is lower than `:identifier`'s, so this exact bug class can't silently return.

### Health route ordering, now genuinely checked, not assumed
`/indicators/health` (a static, single-segment path) is declared ahead of `/indicators/:identifier`
(the dynamic, single-segment catch-all) — the fix described above. Verified against the real
controller's own declared order via the new regression test, not assumed safe by habit (this
project has been burned by exactly this class of bug before, in AI-101's own Phase 4, where
route ordering was checked proactively rather than found reactively — worth noting this phase's
own instance was found reactively, a real miss in the initial build, caught before shipping
rather than after).

### `IndicatorHealthService` does real functional checks, not hardcoded "ok"
`dependencyGraphStatus`/`plannerStatus` are checked by actually building a real graph,
validating it, and generating a real plan against a genuine leaf indicator already in the
registry — not just "did the constructor not throw." `computationEngineStatus` is the one
deliberately simplified check (always "ok") — exercising it for real would require fabricating
a fake execution request, risking a real AI-101 candle fetch as a side effect of a health
check, named explicitly in that service's own comment rather than silently faked as a deep check.

### OpenAPI completeness is real where it matters most, named honestly where it isn't
Full worked request/response examples per endpoint, and exhaustive per-status `@ApiResponse`
decorators on every endpoint, are real, named gaps — closed for the two endpoints most likely to
need them (`get()`, `execute()`), not attempted for all 7. See `AI102_OPENAPI.md`.

## Endpoint Catalog & API Flow

See `AI102_REST_API.md` for the complete catalog, authentication/authorization details, and
versioning approach.

## Assumptions

- Every one of AI-101's 28 registered definitions still fails at the calculation step through
  `POST /indicators/execute` — unchanged since Phase 2B/3; this phase makes the endpoint real
  and reachable, not the arithmetic.
- Correlation/request-id propagation needed zero new code — already fully satisfied by AI-101
  Phase 5's platform-wide `RequestIdMiddleware`, confirmed and reused, not rebuilt.

## Deferred Work

- Real indicator calculations (EMA, RSI, MACD, RDSE, ...) — still entirely absent.
- WebSocket, GraphQL, streaming, background workers, caching — per this phase's explicit scope.
- Standalone execution-status-by-id lookup — no persistence exists to look up from.
- `/api/v2` — architecture-ready, not implemented.
- Full OpenAPI example/error-catalog completeness for all 7 endpoints (currently 2 of 7).

## Phase 5 Prerequisites

1. At least one real `Indicator.calculate()` implementation — this phase's own test suite and
   e2e spec both prove the REST layer is ready the moment one exists.
2. A platform-wide decision on the response-envelope asymmetry this phase found (affects every
   module, not just AI-102 — worth resolving once, not per-module).
3. Persistence for execution history, if a status-by-id lookup endpoint becomes a real need.

## Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors — 2 real bugs found and fixed along the way: a latent `IndicatorCategory` type gap from Phase 2A (the validator accepted `"EXPERIMENTAL"` at runtime; the type never declared it, until this phase's own DTO tried to use the full union), and a stray test calling a method name (`get()`) that didn't match the real controller (`getMetadata()`) |
| Controller architecture rule | ✅ verified structurally (a real test reads the controller's own source file and confirms it imports no repository/registry/planner/graph/computation-engine class) |
| **Route-ordering regression test** | ✅ added after finding a real, serious bug (`health` was declared after `:identifier`, meaning it would have been unreachable in production) — see "Architecture Decisions" above |
| New tests (24 cases across 3 files, +1 regression test added during this review) | ✅ Genuinely executed |
| New e2e spec (11 cases) | ✅ Written and reviewed, including a fix to a stale route path (`/indicators/system/health` → the real `/indicators/health`) found during the same review that caught the routing bug; requires a live database, the same standing limitation as every `.e2e-spec.ts` in this project since Module 001 |
| Full suite | ✅ 63/63 suites, 435/435 tests |
| TODO/placeholder/bare-`any` scan | ✅ none found |

---

**Awaiting your review before Phase 5.**
