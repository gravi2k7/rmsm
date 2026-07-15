# AI-102 — REST API

## Endpoint Catalog

All routes are prefixed `/api/v1/indicators` (the app's own global `api/v1` prefix from
`main.ts`, plus this controller's own `indicators` base path) — **including the health
endpoint**: `main.ts`'s own prefix-exclude list only matches the top-level `health`/`health/ready`
paths exactly, not `indicators/health`, so this module's own health check is real at
`/api/v1/indicators/health`, not excluded from the prefix. Every endpoint requires
authentication (`ApiBearerAuth`) and a specific permission, except health (`@Public()` — a load
balancer/orchestrator probe shouldn't need a token).

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/indicators?category=&tags=&identifier=&version=&page=&pageSize=` | `indicator-engine.read` | Paginated list/search |
| GET | `/indicators/categories` | `indicator-engine.read` | Every category with at least one registered indicator |
| GET | `/indicators/:identifier/versions` | `indicator-engine.read` | Every registered version (e.g. RDSE's real 1.0.0/1.1.0/2.0.0, Phase 2A) |
| GET | `/indicators/:identifier?version=` | `indicator-engine.read` | Full metadata; latest version if `version` is omitted |
| POST | `/indicators/validate` | `indicator-engine.read` | Validate a would-be request without executing it |
| POST | `/indicators/execute` | `indicator-engine.execute` | Full orchestrated execution — see `AI102_PHASE4.md` for what currently succeeds vs. fails |
| GET | `/indicators/executions/:executionId/status` | `indicator-engine.read` | **Always 501** — see "Known Gap" below |
| GET | `/indicators/health` | none (public) | Real, functional health check (item 8) |

**Route ordering, deliberately checked**: `categories`, `validate`, `execute`, and
`executions/:executionId/status` (all static-first-segment or multi-segment paths) are declared
before the bare `:identifier` route in the controller's own method order — NestJS/Express match
routes in registration order, so a literal path segment must be registered ahead of a dynamic
one it could otherwise be swallowed by. Verified by the real route list above matching the
controller's own declaration order, not just assumed safe.

## API Flow

```
Client
    │
    ▼
IndicatorController          (this phase — thin, no business logic, verified structurally)
    │
    ▼
IndicatorEngineServiceImpl   ← the single public entry point (Phase 3)
    │
    ▼
[everything else — see AI102_SERVICE_ARCHITECTURE.md]
```

Errors from AI-102's own 5 internal error hierarchies are caught by `IndicatorExceptionFilter`
(`@UseFilters()`, scoped to this controller only) and mapped to HTTP status codes by each
error's own `code` field. Everything else (NestJS's own `ValidationPipe` failures, platform auth
failures) falls through to the platform's existing `GlobalExceptionFilter`, unchanged.

## Authentication & Authorization

Reuses the platform's existing mechanisms entirely — no new auth logic (item 7's own explicit
rule). `PermissionsGuard` + `RequirePermissions()`, the identical pattern every EP module and
AI-101's own REST layer already use. Two new permission keys (no `organizationId` scoping, since
AI-102 has none — ADR-021's reasoning applied unchanged):

| Key | Granted to |
|---|---|
| `indicator-engine.read` | FREE_USER and above |
| `indicator-engine.execute` | SUBSCRIBER and above (not FREE_USER) |

## API Versioning

`/api/v1/indicators` today. "Prepare architecture for future v2" (item 6) is satisfied
structurally: NestJS's own versioning is controller-path-based, so a real `v2` controller would
live at a parallel path with no change needed to this one. No non-functional `/v2` stub was
added — a route returning nothing meaningful isn't "prepared architecture," it's dead code.

## Response Models

Every endpoint returns its DTO **raw**, not wrapped in a success envelope — matching the
existing, established platform convention exactly (checked directly: AI-101's own Phase 4
controllers, and every EP module's, all return raw data on success; only
`GlobalExceptionFilter`/`IndicatorExceptionFilter` wrap ERROR responses). See
`AI102_PHASE4.md`'s own section on this real platform-level asymmetry.

Pagination follows the identical shape AI-101's own `PaginationMetaDto` established
(`page`/`pageSize`/`totalCount`/`totalPages`/`hasNextPage`/`hasPreviousPage`) — this module's own
copy of that same shape (`rest/dto/indicator-list.dto.ts`), not a cross-module import, so
AI-102's own pagination contract can't silently break from an unrelated change to AI-101's.

## Known Gap: Execution Status Persistence

`GET /indicators/executions/:executionId/status` always returns `501 Not Implemented`. Nothing
in AI-102 through Phase 4 persists a completed `ExecutionResult` keyed by its own id for later
retrieval — a caller must read the full result from the original `POST /indicators/execute`
response. Named explicitly in this endpoint's own OpenAPI description, not silently faked with a
lookup against data that was never saved.
