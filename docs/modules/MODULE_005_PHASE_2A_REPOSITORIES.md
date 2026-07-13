# Module 005 — Phase 2a: Repositories

Status: Complete — Awaiting Approval Before Phase 2b (Providers)

## 1. Scope — 11 of 16 Phase 1 Models, Explicitly

Your deliverables list named 11 repositories. Built exactly those — `NotificationRepository`,
`NotificationTemplateRepository`, `NotificationPreferenceRepository`,
`NotificationQueueRepository`, `NotificationDeliveryRepository`, `NotificationEventRepository`,
`NotificationLogRepository`, `DeviceTokenRepository`, `EmailProviderRepository`,
`SmsProviderRepository`, `PushProviderRepository`. **Not built**: repositories for
`NotificationCategory`, `NotificationAttachment`, `NotificationSchedule`,
`NotificationDigest`, `NotificationWebhook` — five Phase 1 models with no repository yet,
since they weren't in this phase's explicit list. Flagged here rather than silently expanded
into scope or silently left unmentioned; let me know if these should be added now or held for
a later phase.

## 2. "Audit Integration" — Interpreted to Preserve, Not Break, This Project's Architecture

Your list includes "Audit integration" as a repository deliverable. Every repository in this
project since Module 002 has followed one explicit rule (Module 003's own words: "repository
pattern with business logic only in services") — repositories never call `AuditService`
directly; only services do, after a mutation succeeds. Having 11 repositories start calling
`AuditService` themselves would be a real architectural regression, not a feature addition.

What was actually built: every repository correctly threads `createdById`/`updatedById`
through every write (the "audit compatibility" Phase 1's schema doc already required), giving
Phase 2c's services everything they need to wrap each repository call with an
`AuditService.log()` call — the same shape every prior service layer in this project (Auth,
Organizations, Billing) already uses. If this reading doesn't match what you had in mind,
this is worth a direct answer before Phase 2c builds services on top of it.

## 3. A Real Improvement Made This Phase: Deduplicating a 6-Times-Copied Helper

Module 005's coding standards explicitly say "no duplicated code." A specific JSON-safety
helper (`Record<string, unknown>` isn't assignable to Prisma's `InputJsonValue`) has been
hand-copied into 5 separate files across Modules 003/004 without ever being extracted. This
phase needed it a 6th time (`NotificationEventRepository`, `NotificationLogRepository`) — the
right call was to finally extract it, not copy it again. Added `toInputJsonValue()` to
`@rmsm/shared` (new file, `packages/shared/src/json.ts`), with its own test coverage (4 new
tests). Every future JSON-column write in this codebase should import this rather than
re-authoring the function a 7th time.

One design constraint worth noting: `@rmsm/shared` deliberately never depends on
`@rmsm/database`/`@prisma/client` (it's meant to be usable by `apps/web`/`apps/admin` too), so
the helper's return type is a locally-declared `JsonSafeValue` union, structurally identical to
Prisma's `InputJsonValue` — TypeScript's structural typing accepts it at any `Json` column
assignment without a cast, without creating a package dependency that shouldn't exist.

## 4. The Nullable-Compound-Key Bug — Avoided Proactively, Not Fixed Reactively

This is the fourth time this exact Prisma 5.22 limitation has come up in this project
(`RbacService.assignRole`, the TS2742-regression fix, `PermissionHelper.grantPlatformRole`).
`NotificationPreferenceRepository`'s unique key
(`[userId, organizationId, categoryId, channel]`) has two nullable components — I applied the
`findFirst` + conditional `create`/`update` pattern from the start this time, with the file's
own comment naming all three prior occurrences so the pattern is recognizable the next time
someone (human or AI) reaches for `upsert` on a compound key. `DeviceTokenRepository.upsert()`
correctly uses real `upsert`, since `token` alone is a required, non-nullable unique field —
the class comment explains precisely why that one is safe and the other isn't, rather than
leaving the distinction implicit.

## 5. Pagination, Filtering, Search — Where They Actually Apply

`NotificationRepository` and `NotificationTemplateRepository` (the two entities an admin or
end-user would realistically browse/search) implement all three: `take`/`skip` pagination,
status/channel/category filters, and case-insensitive substring search on the relevant text
fields (subject/body for notifications; name/key for templates) — mirroring Module 004's
`InvoiceRepository`/`OrganizationRepository` pattern exactly. The append-only, high-volume log
tables (`NotificationEvent`, `NotificationLog`) get pagination without search (an event log's
`eventType`/`action` field is a better filter than a substring search); provider config tables
(`EmailProvider`/`SmsProvider`/`PushProvider`) get neither, since an organization realistically
has a handful of providers, not thousands — no query pattern needs it yet.

## 6. Transaction Support

Every method on every repository takes an optional trailing `client: DbClient` parameter,
identical to every repository since Module 002 — this is what lets Phase 2c's services compose
atomic multi-repository operations (e.g. "create notification + create initial delivery row +
enqueue" as one `prisma.$transaction`) without any repository knowing about the others. The
three provider repositories' "set as default" capability is deliberately exposed as two
primitives (`unsetAllDefaults` + `setDefault`), not one self-transacting method — composing
them is a service-layer decision (Module 003's Decision 1 precedent: transaction orchestration
belongs in services, repositories provide the atomic primitives).

## 7. Soft Delete

`Notification`, `NotificationTemplate`, `DeviceToken`, `EmailProvider`, `SmsProvider`,
`PushProvider` all support it (`deletedAt`, excluded from default `findFirst`/`findMany` reads
via `deletedAt: null`). `NotificationPreference`, `NotificationQueue`, `NotificationDelivery`,
`NotificationEvent`, `NotificationLog` don't — Phase 1's schema didn't give them a `deletedAt`
column, since a preference row is meaningfully deleted (not archived) when a user clears it,
and the three operational/log tables are append-only by design (Section on those two
repositories, Phase 1 doc).

## 8. Unit Tests — A Genuine First for This Project

11 new tests across `NotificationPreferenceRepository` (4 tests: the nullable-compound-key
avoidance, verified by asserting the exact `findFirst`/`create`/`update` calls made — not just
"it returns something") and `NotificationRepository` (7 tests: filter/search query
construction, soft-delete exclusion, timestamp-setting on status transitions), plus 4 for the
new `toInputJsonValue()` helper.

**These tests actually ran and passed in this sandbox — not just typechecked.** Every prior
test in this project that touches `@rmsm/database` has been blocked by the same
`PrismaClient is not a constructor` issue (Prisma's client was never generated, network-
blocked since Module 001). These repository tests use `jest.mock("@rmsm/database", ...)` to
replace the entire module before it's ever imported for real — which means the blocked
singleton constructor call never executes. This is the first genuinely-executed, passing test
coverage for any database-adjacent code in this entire project. Worth naming explicitly rather
than letting it blend into "same standing limitation as always," because it isn't, for these
11 tests specifically.

## 9. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`, `@rmsm/shared`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/shared`, `@rmsm/api`) | ✅ 0 errors — first attempt |
| **New repository unit tests** | ✅ **11/11 actually executed and passing** (Section 8) |
| `@rmsm/shared` tests | ✅ 15/15 (4 new `toInputJsonValue` tests + 11 pre-existing) |
| Existing `@rmsm/api` unit tests | ✅ 21/21 unaffected |
| TODO/placeholder/bare-`any` scan | ✅ none found |

## 10. What's Deferred to Phase 2b

11 provider adapter implementations (5 email, 4 SMS, 2 push) + 3 registries + `ProviderFactory`
+ `TemplateEngine` implementation + `QueueAdapter` implementation, per
`MODULE_005_PHASE_2_PLAN.md`.

---

**Awaiting your review — especially Section 1's five-model gap and Section 2's "audit
integration" interpretation — before Phase 2b (Providers).**
