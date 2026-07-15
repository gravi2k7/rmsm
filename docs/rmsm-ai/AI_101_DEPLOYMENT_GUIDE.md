# AI-101 — Deployment Guide

## Prerequisites

- Enterprise Platform v1.0 already deployed and operational (Modules 001–005) — AI-101 is
  built entirely on top of it and shares its infrastructure.
- PostgreSQL (existing platform database — AI-101's 13 tables are additive migrations on the
  same schema, not a separate database).
- Redis (existing platform requirement — BullMQ, rate limiting; AI-101 itself does not use
  Redis directly).
- Node.js runtime matching `apps/api`'s existing requirement (unchanged by AI-101).

## Environment Variables

**AI-101 introduces zero new required environment variables.** It reuses the platform's
existing configuration entirely — database connection, JWT secrets, Redis connection are all
already required by the Enterprise Platform and need no AI-101-specific additions. This was
checked directly against `packages/config/src/env.schema.ts` (56 variables total, none
AI-101-specific), not assumed.

**Optional, inherited from the platform, relevant to AI-101's observability**:

| Variable | Required | Notes |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | If set, enables OpenTelemetry export platform-wide (Module 005's own addition) — AI-101's request correlation (`X-Request-Id`) and structured logging work identically with or without this set, and don't depend on it. |
| `OTEL_SERVICE_NAME` | No | Same as above. |

## Database Migration

```bash
# From packages/database, on a machine with real network access
# (this sandbox cannot run prisma generate — the standing limitation
# recorded since Module 001)
pnpm --filter @rmsm/database prisma migrate deploy
pnpm --filter @rmsm/database prisma generate
```

AI-101's 13 models are additive — no existing table's schema changes, no data migration
required for a fresh deployment. Verify with the same scripted relation-pairing audit used
throughout this project's Phase 1s (92/92 relations confirmed paired as of Phase 1).

## Permission Seeding

```bash
pnpm --filter @rmsm/database seed
```

Seeds `market-data.read` (broadly granted — FREE_USER through SUPER_ADMIN) and
`market-data.admin.manage` (ADMIN/SUPER_ADMIN only). Idempotent — safe to re-run against an
existing database (matches every prior module's seed script convention).

## Provider Registration

Only `InternalFeedProvider` ("Custom Provider," `INTERNAL_FEED` type) is registered out of the
box — real provider adapters (Binance, Polygon, Twelve Data, Alpha Vantage, Yahoo Finance) were
explicitly deferred through every phase of AI-101 ("no provider SDK implementations"). A
deployment that needs real market data from an external provider needs that adapter built and
registered via `ProviderFactoryService.registerBuilder()` before it can serve real data —
**AI-101 as delivered through Phase 5 serves only synthetic/internal data**, not real market
prices, until that work happens.

## Health Check Endpoints

| Endpoint | Auth | Use |
|---|---|---|
| `GET /health` | None | Liveness probe |
| `GET /health/ready` | None | Readiness — DB + Redis reachability (platform-wide) |
| `GET /market-data/synchronizations/health` | `market-data.admin.manage` | AI-101-specific — provider circuit-breaker state, all-time failed-import count, direct database check |

Wire `/health` and `/health/ready` into your orchestrator's liveness/readiness probes (unchanged
from the platform's existing convention). `/market-data/synchronizations/health` is for
operator dashboards/alerting, not a Kubernetes probe (it requires authentication).

## Rollback

AI-101's migrations are purely additive (new tables, new enums) — rolling back the application
code without rolling back the schema is safe (unused tables, no harm). Rolling back the schema
itself (dropping AI-101's tables) is a standard `prisma migrate` rollback, unaffected by
anything AI-101-specific.

## Post-Deployment Verification

1. `GET /health` → `200 {"status":"ok"}`
2. `GET /health/ready` → `200`, both checks `"ok"`
3. `GET /market-data/exchanges` with a valid token → `200`, `data: []` (empty until reference
   data is seeded/imported — a fresh deployment has no exchanges/instruments yet, and AI-101
   itself provides no seed data for them, another named gap: reference-data seeding is an
   operator task, not something this module ships with)
4. `GET /market-data/synchronizations/health` with an admin token → `200`, `providers: [{type:
   "INTERNAL_FEED", ...}]`
