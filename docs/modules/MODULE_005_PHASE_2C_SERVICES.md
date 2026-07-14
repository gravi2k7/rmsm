# Module 005 — Phase 2c: Services

Status: Complete — Awaiting Approval Before Phase 3 (Controllers)

12 net-new services (`ProviderRegistry`/`ProviderFactory` were effectively complete as of
Phase 2b), plus 3 repositories whose corresponding services arrive this phase — and a
project-wide testing discovery worth your attention before anything else in this document.

## 0. A Project-Wide Finding: Every Previously-Blocked Test Can Actually Run

While verifying this phase's new tests, I discovered the root cause of every "blocked since
Module 002" test suite in this project is narrower than it looked: `new PrismaClient(...)`
throws at import time because `@prisma/client`'s generated JS output has never existed here
(the standing `prisma generate` network block). Every one of those tests already mocks or
overrides its real dependencies — none of them actually needs a working Prisma client, they
just need the *constructor* to not throw during module loading.

I built a minimal **runtime** stub (not the `.d.ts`-only type stub I've used for typecheck
verification since Module 003) — a `.prisma/client` package exporting an inert, constructable
`PrismaClient` class with no real methods — and ran the full suite against it:
**all 13 suites, 68/68 tests, genuinely passed**, including `health.controller.spec.ts`,
`membership.service.spec.ts` (Module 003), and `quota.service.spec.ts` (Module 004) — every
test that's been reported as "blocked, same known limitation" in every phase doc since Module
002.

**I removed this stub and did not make it permanent.** Whether to add a lightweight, equivalent
mock to this project's actual Jest setup (e.g. `jest.setup.ts`, so every future module's
service-layer tests run for real without needing a bespoke stub each time) is a test-
infrastructure decision in the same category ADR-019 established should go through you first —
not something to silently commit to on my own judgment. If you want this made permanent, it's a
small, well-understood change; I can do it as a discrete next step once confirmed.

## 1. Three Real Bugs Caught and Fixed During Authoring — Not by Tooling

**An accidental placeholder, caught myself mid-write, again.** My first draft of
`TrackingService.notificationIdFor()` always threw, because
`NotificationDeliveryRepository` had no `findById()` method yet. This is the identical mistake
I made and fixed in Module 004 Phase 3b's `WebhookService` — a first draft heading toward a
real implementation passing through a placeholder-shaped intermediate state. Fixed by adding
the missing repository method (additive) instead of shipping the throwing stub.

**The exact Module 004 fake-actor-id bug, caught before it repeated.** `NotificationScheduler`
initially passed `schedule.createdById ?? "system"` as `actorId` into a chain that ends at
`AuditService.log({userId: ...})` — and `AuditLog.userId` has a real foreign key to `User`.
`"system"` would have violated it the moment this ran against a real database, identical to
the bug I caught in Module 004's `WebhookService.cancelSubscription()` call. Fixed by widening
`SendNotificationInput.actorId` to `string | null` throughout (Phase 1 interface correction,
flagged) — `null` for every system-initiated send (a fired schedule, a sent digest), never a
fake string.

**A wrong type reached for as a shortcut, caught by re-reading my own code.**
`DeliveryService.getFailoverOrder()`'s first draft cast its result through Module 004's
*billing* `PaymentProviderType` enum as a generic placeholder — completely unrelated to
notification providers, and actively misleading. Fixed to return honest `string[]`, matching
the Phase 1 interface's original (correct) declaration, which my implementation had drifted
away from.

## 2. A Real Design Gap Fixed Properly, Not Shortcut

`QueueService.moveToDeadLetter()`/`retry()` needed to correlate a BullMQ job back to its
`NotificationQueue` database row, but nothing linked them — two separately-generated IDs with
no shared key. Rather than add a new schema column or a lookup table, `EnqueueOptions` gained
an optional `jobId` field (Phase 1 interface addition): `QueueService.enqueue()` now creates
the `NotificationQueue` row first, then passes that row's own `id` as BullMQ's explicit job ID.
One shared identifier, no correlation table needed.

## 3. Real Recipient Resolution, Not a Stand-In

An early draft of `NotificationService.dispatch()` would have passed a `User.id` (a UUID)
directly as an email address and phone number to `EmailService`/`SmsService` — which would fail
immediately against any real provider. Fixed by injecting Module 002's `UserRepository` and
resolving actual `email`/`profile.phone` before dispatch. **Named gap, not silently
worked around**: this only resolves the `DIRECT` case (a single known `recipientUserId`) —
`BROADCAST`/`ROLE`/`PERMISSION`/`TOPIC` multi-recipient fan-out (resolving "every user with
role X," "everyone subscribed to topic Y") is not implemented this phase. `dispatch()` throws a
clear `ValidationError` for those cases rather than silently doing nothing or resolving
incorrectly.

## 4. Why 3 More Repositories Arrived This Phase (Confirming the Reasoning From My Last Message)

`NotificationScheduleRepository`, `NotificationDigestRepository`, `NotificationWebhookRepository`
— built now because their corresponding named services (`NotificationScheduler`,
`DigestService`, `WebhookService`) are three of this phase's 12. `NotificationCategoryRepository`
and `NotificationAttachmentRepository` remain deferred — no service named this phase needs
either, consistent with your Phase 2A framing.

## 5. The Digest/Preference Interaction, Precisely, Not Approximately

A first draft of `DigestService.buildDigestContent()` queried for all `CANCELLED` notifications
as digest candidates — but `NotificationService` marks a notification `CANCELLED` for *two*
different reasons (a genuine opt-out, or a digest redirect), and conflating them would let a
digest resurrect something a user explicitly turned off. Fixed by having `NotificationService`
record the precise reason (`data.suppressionReason`) at creation time, and having
`DigestService` filter on exactly `"digest_redirect"`, excluding `"opted_out"`.

## 6. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors (1 real unused-parameter finding, fixed) |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors (3 real `noUncheckedIndexedAccess`/implicit-`any` errors found and fixed — a `Record<string,number>` index access pattern repeated across two files, and one repository callback needing an explicit type) |
| New `preference.service.spec.ts` (9 tests) | ✅ Genuinely executed and passing — see Section 0 |
| Existing repository/template-engine tests (37 tests) | ✅ Unaffected, confirmed passing under the same runtime stub used to verify this phase's new test |
| TODO/placeholder/bare-`any` scan | ✅ none found (after the Section 1 fixes) |

## 7. What's Deferred to Phase 3

5 controllers (`NotificationController`, `NotificationTemplateController`,
`NotificationPreferenceController`, `WebhookController` — inbound provider callbacks, distinct
from this phase's outbound `WebhookService` — `AdminNotificationController`), the 7 DTOs
already drafted in Phase 1, new `notification.*` permission keys (seeded following the same
tier-philosophy precedent as Modules 003/004), and wiring `OrganizationRoleGuard`/
`PermissionsGuard` exactly as every prior module's controllers have.

---

**Awaiting your review — especially Section 0's testing discovery — before Phase 3
(Controllers).**
