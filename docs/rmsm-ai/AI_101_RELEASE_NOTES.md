# AI-101 — Release Notes

## v1.0.0 — Market Data Management, Phases 1–5 Complete

AI-101 is the authoritative market-data subsystem for RMSM AI, built on Enterprise Platform
v1.0. This release covers architecture through production hardening (Phases 1–5); no AI-102+
engine work is included.

### What's Included

- **Schema**: 13 models, 10 enums, additive to the platform database (Phase 1).
- **Repositories**: 13, returning domain models rather than Prisma types — a deliberate,
  documented departure from every prior module's convention (ADR-025).
- **Provider infrastructure**: Registry, Factory, Resolver, 8 capability interfaces, and one
  real reference provider (`InternalFeedProvider` / "Custom Provider") proving the pipeline
  works end to end (Phase 2B).
- **Normalization & validation**: 10 normalizers, 7 validators, a standardized error model —
  pure, deterministic, side-effect-free (Phase 2C).
- **Services**: read-side query API, write-side import orchestration (fetch → validate →
  deduplicate → persist, transactionally, with retry/audit/metrics), sync decision logic
  (Phase 3).
- **REST API**: 24 endpoints across 8 controllers, offset pagination, consistent error
  handling, Swagger-documented (Phase 4).
- **Production hardening**: timeout handling, a real circuit breaker, platform-wide request
  correlation, extended health checks, validation metrics, integration test coverage, load
  test infrastructure (Phase 5).

### What's NOT Included (By Design)

- **No real market data.** Only `InternalFeedProvider` (synthetic/deterministic) is registered.
  Binance, Polygon, Twelve Data, Alpha Vantage, and Yahoo Finance adapters were explicitly out
  of scope through every phase ("no provider SDK implementations").
- **No streaming/real-time ingestion.** REST, WebSocket, FIX, MT5, and TradingView bridges are
  all deferred to a later, dedicated AI-101 phase (ADR-023).
- **No reference-data write path.** Nothing in this release creates an `Exchange` or
  `Instrument` over HTTP — see `AI_101_OPERATIONS_RUNBOOK.md`'s "Known Operational Gap" section.
- **No holiday/trading-calendar support.** `TradingSession` covers weekly recurrence only
  (ADR-024).
- **No historical quotes, no exchange-filtered instrument search, no corporate-action search
  beyond a single instrument, no cursor pagination.** Five real gaps surfaced by building
  strictly on the existing repository layer with no repository changes permitted in Phase 4 —
  consolidated in ADR-030.

### Breaking Changes

None — every phase was additive. No Enterprise Platform file was modified in a way that changes
existing behavior (request correlation middleware is new and additive; existing routes behave
identically, just with an extra response header and log-line prefix).

### Upgrade Notes

- Run the standard migration + seed sequence (`AI_101_DEPLOYMENT_GUIDE.md`).
- Two new permission keys (`market-data.read`, `market-data.admin.manage`) are seeded
  automatically into existing role tiers — no manual grant needed for standard tiers.
- No new environment variables required.

### Known Limitations Summary

See `AI101_PRODUCTION_READINESS_REPORT.md` for the complete list with reasoning; the two most
operationally significant are the reference-data write-path gap (above) and the
single-instance-only circuit breaker/metrics (no shared state across horizontally-scaled
deployments).
