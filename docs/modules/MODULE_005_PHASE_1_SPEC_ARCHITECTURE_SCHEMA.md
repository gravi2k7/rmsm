# Module 005 — Notifications & Communication Platform
## Phase 1: Specification, Architecture, Database Schema, Interfaces

Status: Complete — Awaiting Approval Before Phase 2

Per the prompt's explicit scope, this phase delivers architecture, database schema, interfaces
(provider adapters, repository contracts, service contracts), DTOs, folder structure, and
documentation only. **No repository, service, or controller implementation exists yet** —
every `.ts` file delivered this phase is a type/interface declaration or a validation DTO, none
of it business logic. This mirrors the exact discipline Module 003 and Module 004 both applied
at their own Phase 1.

## 1. Scope Resolution — One Ambiguity, Resolved the Same Way as Before

The prompt's 20-item model list mixes genuine entities with four classification concepts
(`NotificationChannel`, `NotificationStatus`, `NotificationPriority`, `NotificationType`).
Modeled as enums (see ADR-016) — the identical resolution Module 004's Phase 1 applied to its
own ambiguous model list. 16 real models, 12 enums (4 from the ambiguity above, 8 more needed
to actually represent the fields the spec describes — provider types, delivery/queue status,
schedule frequency, device platform, template format — flagged individually in the schema).

## 2. Database Schema

### Models (16, matching every genuine entity in the prompt's list)

`NotificationCategory`, `EmailProvider`, `SmsProvider`, `PushProvider`, `NotificationTemplate`,
`Notification`, `NotificationAttachment`, `NotificationDelivery`, `NotificationEvent`,
`NotificationLog`, `NotificationQueue`, `NotificationSchedule`, `NotificationDigest`,
`NotificationPreference`, `DeviceToken`, `NotificationWebhook`.

Every model carries the fields the prompt's "Every model must include" list specifies
(`id`, `createdAt`, `updatedAt`, `createdById`/`updatedById`, tenant isolation via
`organizationId`, soft delete where the entity's lifecycle warrants it, indexes, relations) —
full field-level detail and reasoning is in `schema.prisma` itself; every non-obvious design
choice has an inline comment there rather than being duplicated here.

**Tenant isolation, with one documented exception per model**: every model has
`organizationId`, but on 6 of them (`EmailProvider`, `SmsProvider`, `PushProvider`,
`NotificationTemplate`, `NotificationCategory`) it's **nullable**, meaning "platform-wide
default," not "ungoverned." This isn't a tenant-isolation gap — it's the same pattern Module
004 used for `SubscriptionPlan` visibility and Module 002 used for system roles: a null
organization scope is a deliberate, documented platform-level default, always distinguishable
from a real organization's row by the null check itself.

### A Real Limitation, Flagged Rather Than Hidden

`NotificationCategory.key` and `NotificationPreference`'s wildcard columns both need "unique
among all `organizationId = NULL` rows" semantics that a plain compound unique constraint
doesn't correctly express (Postgres treats every `NULL` as distinct from every other `NULL` for
uniqueness purposes) — the exact same class of limitation as Module 003's single-active-owner
constraint (ADR-004), which needed a hand-written partial unique index. Not fixed in
`schema.prisma` this phase — flagged inline at both models, with the same remediation path
(a hand-written SQL migration) documented as a named Phase 2+ follow-up, not silently deferred.

### Entity-Relationship Diagram

See `MODULE_005_ARCHITECTURE.md` for the full Mermaid ER diagram, sequence diagrams (send flow,
webhook-driven delivery tracking, digest generation), and module dependency graph.

## 3. Provider Abstraction — The Third Application of One Proven Pattern

`EmailProviderAdapter`, `SmsProviderAdapter`, `PushProviderAdapter` (all under
`interfaces/providers/`) are structurally identical to Module 004's `PaymentProviderAdapter` —
same shape, same "no SDK coupling, verify signatures per-provider, registry-based lookup"
philosophy (ADR-018). This is the third time this exact pattern has been applied in this
project (OAuth in Module 002, payments in Module 004, now notifications) — not a new
architecture decision, a proven one reused deliberately.

`TemplateEngine` and `QueueAdapter` interfaces are new to this module: the former because no
prior module needed variable/conditional/loop template rendering; the latter because
`NotificationQueue` (the Prisma model) is explicitly a companion to Module 001's existing
BullMQ setup, not a new queue system (ADR-017) — `QueueAdapter` is the seam that keeps
`QueueService` (Phase 2) from depending on BullMQ's API directly, the same "depend on an
interface" discipline applied everywhere else in this codebase.

## 4. Repository & Service Contracts — Organized, Not One-File-Per-Model

16 models would mean 16 tiny repository-contract files under this project's usual one-
repository-per-model convention. For **contracts** (interfaces, not implementations) that
granularity adds file-count overhead without adding clarity, so this phase groups them into 4
repository-contract files and 4 service-contract files by domain area (core notification
delivery, configuration, scheduling, user-facing preferences/devices/webhooks) — a deliberate
organizational choice, flagged here rather than silently deviating from precedent. **Phase 2's
actual repository implementations should still be one class per model**, matching every prior
module — this grouping is specific to the contract-declaration phase, not a change to the
implementation convention itself.

All 14 services named in the prompt have a corresponding interface:
`INotificationService`, `IEmailService`, `ISmsService`, `IPushService`, `IWebhookService`,
`IQueueService`, `ITemplateService`, `IPreferenceService`, `IDeliveryService`,
`IProviderRegistry` (generic, instantiated three times — email/SMS/push), `IProviderFactory`,
`INotificationScheduler`, `IDigestService`, `ITrackingService`.

## 5. Folder Structure

```
apps/api/src/modules/notifications/
├── interfaces/
│   ├── providers/
│   │   ├── email-provider.interface.ts
│   │   ├── sms-provider.interface.ts
│   │   └── push-provider.interface.ts
│   ├── repositories/
│   │   ├── notification-core.repository.interface.ts
│   │   ├── notification-config.repository.interface.ts
│   │   ├── notification-scheduling.repository.interface.ts
│   │   └── notification-user.repository.interface.ts
│   ├── services/
│   │   ├── notification-core.service.interface.ts
│   │   ├── notification-channel.service.interface.ts
│   │   ├── notification-infra.service.interface.ts
│   │   └── notification-scheduling.service.interface.ts
│   ├── template-engine.interface.ts
│   └── queue-adapter.interface.ts
├── dto/
│   ├── send-notification.dto.ts
│   ├── bulk-send-notification.dto.ts
│   ├── schedule-notification.dto.ts
│   ├── create-template.dto.ts
│   ├── create-notification-webhook.dto.ts
│   ├── notification-list-query.dto.ts
│   └── update-preference.dto.ts
├── repositories/        ← Phase 2 (16 implementation classes, one per model)
├── providers/            ← Phase 2 (SMTP/SES/SendGrid/Mailgun/Resend, Twilio/MessageBird/
│                             Vonage/SNS, FCM/APNs adapter implementations + 3 registries)
├── services/              ← Phase 2 (14 implementation classes)
├── notification.controller.ts        ← Phase 2
├── notification-template.controller.ts  ← Phase 2
├── notification-preference.controller.ts ← Phase 2
├── webhook.controller.ts             ← Phase 2 (inbound provider callbacks)
├── admin-notification.controller.ts  ← Phase 2
└── notifications.module.ts           ← Phase 2 (wires everything above)
```

## 6. Integration Points With Modules 001–004

- **Module 001**: reuses `QueueModule`'s existing BullMQ/Redis setup (via `QueueAdapter`, not a
  new Redis connection); reuses `EmailModule`'s `EmailService` interface pattern as prior art
  for `EmailProviderAdapter`'s shape (not the same interface — Module 002's `EmailService` is
  simple send-only; this module's channel abstraction needs bounce/open/click tracking Module
  002 never needed).
- **Module 002**: `AuditService` will be reused by every Phase 2 service exactly as every prior
  module has (no notification-specific audit mechanism invented); `recipientPermission` on
  `Notification` references Module 002's `Permission.key` values directly.
- **Module 003**: every model's `organizationId` FK targets `Organization` (Module 003);
  `recipientRole` on `Notification` uses Module 003's existing `OrganizationRole` enum, not a
  new one; `OrganizationRoleGuard` will gate organization-scoped notification endpoints in
  Phase 2+, same as every billing endpoint in Module 004.
- **Module 004**: no direct schema coupling, but the provider-credential-encryption approach
  (`credentialsEnc` columns) and the registry/factory split both follow Module 004's
  established shape directly, and future modules (billing-triggered notifications — "payment
  failed," "subscription renewed") will call into this module's `INotificationService`, not the
  other way around.

**Zero Module 001–004 files were modified this phase.** Every addition is new files plus
purely-additive reverse relations on `Organization` and `User` (same category of change every
prior module's Phase 1 made).

## 7. Acceptance Criteria for This Phase

- [x] 16 models covering every genuine entity in the prompt's list; 4 ambiguous items resolved
      as enums and flagged (ADR-016)
- [x] Every model has `id`/`createdAt`/`updatedAt`/audit fields/tenant isolation per the
      prompt's explicit requirement
- [x] Provider abstraction (email/SMS/push) with zero SDK coupling, matching the proven
      Module 002/004 pattern (ADR-018)
- [x] Template engine interface supporting variables/conditionals/loops/localization per spec
- [x] Queue system designed as a BullMQ companion, not a competing implementation (ADR-017)
- [x] Repository and service contracts for every named entity/service
- [x] DTOs for every endpoint named in the prompt's API Endpoints section
- [x] Zero Module 001–004 files modified
- [x] `pnpm lint` — 0 errors; `pnpm typecheck` — 0 errors (verified against an extended stub;
      real Prisma client generation remains blocked in this sandbox, as in every prior module)
- [x] Zero TODOs/placeholders/bare `any` in any delivered file

## 8. Known Gaps, Flagged Explicitly

- **Two nullable-scope uniqueness gaps** (Section 2) needing a hand-written partial index,
  matching Module 003's Decision 1 precedent — not fixed this phase.
- **`NotificationSchedule`/`NotificationDigest`'s targeting/category-set fields use JSON, not
  join tables** — a deliberate simplicity choice for Phase 1, flagged inline in the schema as a
  straightforward follow-up migration if per-category querying becomes a real requirement.
- **No `TOPIC` subscription-management table** — `Notification.topic` is a free-form string;
  there's no `NotificationTopic` model tracking who's subscribed to what. The prompt's model
  list didn't name one, and inventing a 17th model beyond what was asked for would be scope
  creep, not thoroughness — flagged as a real, intentional gap rather than silently
  implemented anyway.

---

**Awaiting your review before Phase 2 (Repositories, Providers, Services).** See
`MODULE_005_PHASE_2_PLAN.md` for the detailed implementation plan Phase 2 will follow once
approved.
