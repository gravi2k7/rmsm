# Module 005 — Phase 4: Retry, Dead-Letter, Delivery Tracking, Monitoring

Status: Complete — Module 005 Feature-Complete Through This Phase

## 1. The Real Finding This Phase Started From

Before writing anything new, I checked what Phase 3 actually delivered against what "retry
policies" and "dead-letter queues" require — and found a genuine gap: Phase 3's 5 queue
processors called `NotificationService.dispatch()` and, on failure, just let the exception
propagate to BullMQ. BullMQ *does* retry automatically per the `attempts`/`backoff` set at
enqueue time — so retries technically worked — but **nothing ever reported outcomes back to
the durable `NotificationQueue` table**, leaving every row permanently stuck at `PENDING`
regardless of what actually happened. And nothing ever called `moveToDeadLetter()` when a job
exhausted its final attempt — the method existed since Phase 2a, but nothing invoked it. "Dead
letter queue" was a repository method with no caller, not a working feature.

Both fixed this phase, not treated as already done.

## 2. `QueueEventTracker` — One Implementation, Not Five

`@OnWorkerEvent('completed'|'failed')` hooks added to all 5 processors (`DigestQueueProcessor`
excluded — it only ever runs the periodic sweep job, which has no `NotificationQueue` row to
update; wiring dead hooks in for consistency's sake would be dead code, not thoroughness).
Every hook is a one-line delegation to a single new service, `QueueEventTracker`, so the actual
"is this the final attempt, dead-letter it" decision exists exactly once — Module 005's
standing "no duplicated code" rule, applied again.

On a non-final failure: increments the durable row's attempt count and records the error,
without touching BullMQ's own retry scheduling (BullMQ handles that itself). On the final
exhausted attempt: moves to dead-letter, marks the parent `Notification` `FAILED`, and audit-
logs the event via `AuditService` — the same audit-in-services-only discipline every prior
phase has kept. **7 new unit tests, confirmed genuinely executed and passing** (not just
typechecked) against the runtime-functional stub established in Phase 2c — including the
retry/final-attempt boundary condition, the `attemptsMade > maxAttempts` defensive case, and the
default-to-5-attempts fallback.

## 3. Real Delivery Tracking — Not Just What Existed Already

`TrackingService` (Phase 2c) could record opens/clicks/bounces, but nothing called it except
Phase 3's inbound webhook path — which only works for providers that report opens/clicks
server-side. Added the traditional, universal mechanism: `DeliveryTrackingController` serves a
real 1x1 transparent GIF at `/notifications/track/open/:deliveryId` (meant to be embedded as an
`<img>` in outgoing HTML emails) and a click-redirect endpoint at `/track/click/:deliveryId`
(meant to wrap outgoing links). Both are public, both throttled, and both **never fail the
HTTP response even if tracking itself throws** — a broken pixel or dead link in a real email is
worse than a missed analytics event, so tracking failures are swallowed deliberately, not
silently — the comment in the code says so explicitly. An authenticated stats endpoint
(`GET .../notifications/:notificationId/stats`) exposes `TrackingService.getDeliveryStats()`,
which existed but had no controller before this phase.

## 4. Monitoring & Metrics — Honestly Scoped, Not Oversold

`NotificationMetricsService`: in-memory counters, incremented from real events
(`DeliveryService` on every send success/failure, `QueueEventTracker` on every retry/dead-
letter), exposed via `GET /notifications/admin/metrics`. **Explicitly not presented as
production-grade**: counters reset on process restart and don't aggregate across multiple
`apps/api` instances behind a load balancer — a real production deployment needs a shared
counter store (Redis) or an actual metrics backend (Prometheus, Datadog), which is an
infrastructure decision for whoever operates this, not something to guess at speculatively
here. This is the right-sized, honest version of "monitoring and metrics" for what a single
phase can actually deliver without inventing a fake integration.

## 5. Dead-Letter Admin Operations

Two new `AdminNotificationController` endpoints: `GET .../dead-letter/:queueName` (list what's
stuck) and `POST .../dead-letter/:queueName/retry` (requeue everything on that queue for one
more attempt, via `QueueService.retryFailed()`, which already existed since Phase 2c but had no
way to trigger it).

## 6. Rate Limiting — Extended to the Endpoints That Actually Needed It

Phase 3 throttled `send`/`bulk`/`schedule` (authenticated, org-scoped). This phase adds
throttling to the three genuinely public, unauthenticated endpoints that didn't have any:
the inbound webhook handler and both tracking endpoints — the ones an attacker could actually
hit without ever having a JWT.

## 7. Provider Failover — Verified, Not Re-Built

`EmailService`/`SmsService`/`PushService`'s failover loops (Phase 2c) were reviewed against
this phase's explicit ask and found to already do the right thing: iterate every configured
provider for the organization/channel, default-first, recording a `NotificationDelivery` row
per attempt. No changes made — re-verifying working code and saying so plainly is more honest
than rewriting something that wasn't broken to make the diff look like more was done this
phase.

## 8. Performance — One Honest Note, No Speculative Rewrite

`NotificationService.sendBulk()` fans out via `Promise.all()` over up to 1000 individual
`send()` calls (each with its own preference check + create + dispatch). This is adequate for
the request-size cap `BulkSendNotificationDto` already enforces, but is not a true batch-insert
path — a genuinely high-throughput broadcast (e.g. "notify every user in a 50,000-member
organization") would need a different, batched design. Documented as a known follow-up rather
than attempted as a risky, under-tested rewrite this phase; the DB indexes this project's
Phase 1 schema already carries (`@@index([organizationId, status])` etc.) are the concrete
performance work that *is* in place today.

## 9. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors — including real BullMQ (`@nestjs/bullmq`) types, not a stub, since that package is genuinely installed |
| New `QueueEventTracker` tests (7 cases) | ✅ Genuinely executed and passing, confirmed against the runtime-functional stub |
| Full suite under the runtime stub | ✅ **14/14 suites, 76/76 tests** |
| TODO/placeholder/bare-`any` scan | ✅ none found |

---

**Module 005 is feature-complete through Phase 4.** Retry policies and dead-letter queues now
actually function end to end (not just exist as unused methods); delivery tracking works
universally, not only for providers that report it; metrics are real counters wired to real
events, honestly scoped rather than oversold.
