# AI-103 Strategy Engine — Operations Guide

## What to watch

### Outbox publisher (backend)
`StrategyEventMetricsService` exposes real in-memory counters: events published, handler
failures, average latency per event type, retry count (Milestone 4). Two states to alert on:

- **Poison events accumulating** — an event that exhausted `STRATEGY_OUTBOX_MAX_RETRIES` moves to
  `POISON` and is never retried automatically. A steady trickle of poison events usually means a
  downstream handler bug (e.g. `AuditEventHandler` failing consistently), not a transient
  infrastructure blip. Poisoned rows stay in the `StrategyOutboxEvent` table for manual triage —
  there's no automatic dead-letter reprocessing yet.
- **Publisher falling behind** — rising `STRATEGY_OUTBOX_BATCH_SIZE`-sized backlog with the poll
  loop running suggests the publisher can't keep up; check downstream handler latency (metrics
  service tracks average latency per event type) before increasing batch size or poll frequency.

### Correlation IDs
Every command carries an optional `correlationId`, populated from `req.requestId` (the platform's
existing `RequestIdMiddleware`, applied globally since AI-101 Phase 5) at each controller call
site. Use it to trace a single user action end-to-end through structured logs — search for the
same `requestId=` value across the API's own logs and the outbox publisher's own span
attributes (OpenTelemetry tracing reuses `notifications/services/notification.service.ts`'s
existing pattern, not a new observability mechanism).

### Frontend error visibility
Every mutation (`useMutation` calls in `hooks/use-strategies.ts` /
`hooks/use-strategy-versions.ts`) surfaces its own failure as a toast with the backend's own
error message — there's no separate frontend error-tracking pipeline (e.g. Sentry) wired in yet;
that would be a real, named gap if browser-side error monitoring is required in production.

## Runbook: a strategy is stuck in `PENDING_APPROVAL`

1. Check whether an approver has the right role/permission for that organization (
   `OrganizationRoleGuard` + `@RequireOrgRole` + platform `PermissionsGuard` — the same two-guard
   pattern every AI-103 endpoint uses). A missing permission grant, not a Strategy Engine bug, is
   the most common cause.
2. Confirm the version's own `Approval` row exists (`GET /organizations/:orgId/strategy-versions/
   :versionId` returns the version; the approval record itself isn't exposed by a dedicated GET
   endpoint in this milestone — check via the database directly if needed).
3. If genuinely stuck with no approver available, there's no "force approve" escape hatch by
   design — this platform has no hard-delete/force-override pattern anywhere, consistent with
   every other module's soft-delete-only convention.

## Runbook: outbox events aren't reaching the audit log

1. Confirm `STRATEGY_OUTBOX_PUBLISHER_ENABLED=true` in the API's environment.
2. Check `StrategyEventMetricsService`'s handler-failure counter for `AuditEventHandler`
   specifically — a failure there means the shared platform `AuditService.log()` call itself is
   failing (e.g. audit table write failure), not something Strategy-Engine-specific.
3. Remember failure isolation is real: one handler's failure never blocks the other four
   (`MetricsEventHandler`, `SearchIndexingHandler`, `AnalyticsHandler`,
   `NotificationPlaceholderHandler`) from processing the same event.

## Runbook: the Strategy Builder UI shows "No session connected"

Expected, not a bug — see the Developer Guide. There's no login screen in this milestone; a
developer/operator pastes an org id + access token via the Session Bar. If this is unexpected in
a production deployment, it means a login flow hasn't been built on top of this UI yet (a real,
named gap, not an outage).

## Backup / rollback

No AI-103-specific backup procedure exists beyond the platform's own database backup strategy —
this module adds tables (via Milestone 2 + 4 migrations) to the same Postgres instance every other
module uses. Rolling back a bad deployment: redeploy the previous API/web image tags; the
database migrations in this module are additive (new tables/enum, no destructive column changes),
so no down-migration has been required to date. If a future migration does need reverting, follow
the platform's existing Prisma migration rollback procedure (not AI-103-specific).
