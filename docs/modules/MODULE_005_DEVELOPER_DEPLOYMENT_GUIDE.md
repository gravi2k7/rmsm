# Module 005 — Developer & Deployment Guide

## For Phase 2 Implementers

Every interface delivered in Phase 1 (`apps/api/src/modules/notifications/interfaces/`) is the
contract Phase 2's implementation must satisfy — not a suggestion. Implementation classes go in
sibling directories that don't exist yet (`repositories/`, `providers/`, `services/`), matching
the folder structure documented in `MODULE_005_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md` Section 5.

**Before writing any repository**: re-read `packages/database/prisma/schema.prisma`'s Module
005 section — every non-obvious field has an inline comment explaining the design decision
behind it (nullable-scope meaning, JSON-vs-join-table tradeoffs, the two flagged
partial-unique-index gaps). Don't re-derive intent from field names alone.

**Repository pattern discipline**: one class per model (16 total), each method taking an
optional trailing `client: DbClient` parameter, exactly like every repository in Modules
002–004. The Phase 1 interfaces group multiple models per file for contract-readability, but
implementations should not — see Phase 1 doc Section 4 for why that distinction is deliberate.

**TS2742 discipline, learned expensively in this project**: every repository/service method
needs an explicit, named return type from the start. Do not return a Prisma query result
directly without an annotation — this has caused real, fixed bugs in three prior modules
(see `docs/modules/TS2742_FIX_CHANGELOG.md` and the Module 004 Phase 2 repository doc's
Section 3 for what happens when this discipline slips).

**JSON field handling**: any repository method writing to a `Json` column (`Notification.data`,
`NotificationEvent.metadata`, `NotificationDigest.categoryKeys`, `NotificationWebhook.eventTypes`,
etc.) needs the same `toInputJsonValue()` JSON-round-trip helper this project has now used in
five different files — `Record<string, unknown>` (or any plain object) is not directly
assignable to `Prisma.InputJsonValue`. Apply it from the start; don't wait to hit the error.

## Queue Setup (reusing, not replacing, Module 001)

Module 001's `apps/api/src/modules/queue/queue.module.ts` already provides a working BullMQ
connection. Phase 2's `QueueAdapter` implementation should register new named queues
(`email`, `sms`, `push`, `digest`, `scheduled`) against that existing connection via
`BullModule.registerQueue({ name: '...' })` — not open a second Redis connection. The
`NotificationQueue` Prisma model (ADR-017) is a durable companion table, populated alongside
every BullMQ job, not instead of one.

## Encryption

Reuse the AES-256-GCM approach from Module 002's `TwoFactorSecret` (see that module's
`TwoFactorService.encryptSecret()`/`decryptSecret()`) for every `credentialsEnc`/`secretEnc`
column this module introduces — same technique, a new key
(`NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY`, distinct from `TWO_FACTOR_ENCRYPTION_KEY`), not a
shared one (credential-class separation, so rotating one doesn't require rotating the other).

## Rate Limiting

Module 001's `ThrottlerModule` is already global (`app.module.ts`) and applies to every
endpoint by default. Phase 2's notification-send endpoints likely need a *tighter* limit than
the platform default (bulk-send abuse is a real concern for a notification system specifically)
— this means a route-level `@Throttle()` override on `POST /notifications/send` and
`POST /notifications/bulk`, not a new rate-limiting mechanism.

## Deployment Notes

- No new infrastructure component is required — this module runs inside the existing `apps/api`
  NestJS process and the existing Redis instance (Module 001's `docker-compose.yml`).
- Provider credentials must be configured per-environment before this module is functional in
  anything beyond a platform-default-provider configuration — see
  `MODULE_005_PROVIDER_INTEGRATION_GUIDE.md`.
- The digest/schedule processing jobs (`NotificationScheduler`, `DigestService`) are BullMQ
  *repeatable* jobs, not a separate cron process — no new deployment target, just new job
  registrations within the existing worker process.
- **Migration**: same standing limitation as every prior module — this sandbox cannot run
  `prisma generate`/`migrate dev`. The first real verification this schema gets must happen on
  a machine with normal network access, following the same runbook pattern established since
  Module 002 (`docs/VERIFICATION_RUNBOOK.md`).

## Verification Commands (for Phase 2 completion)

```bash
pnpm --filter @rmsm/database generate
pnpm --filter @rmsm/database migrate:dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
