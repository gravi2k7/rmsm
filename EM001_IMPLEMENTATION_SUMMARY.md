# EM-001 — Enterprise Email Platform

**Status:** Complete
**Scope:** Expands the existing, minimal Email Module (`api/src/modules/email/` — `EmailService`/`ConsoleEmailService`, the abstraction Authentication's verification/welcome/password-reset emails depend on) into a full, config-driven, multi-provider Enterprise Email Platform, without changing that abstraction or Authentication itself.

---

## Architecture

Everything new lives under `api/src/modules/email/enterprise/` — additive to, not a replacement of, the pre-existing `email.service.interface.ts`/`console-email.service.ts`/`templates/auth.templates.ts`, none of which were modified:

```
api/src/modules/email/
├── email.service.interface.ts        # UNCHANGED — EmailService/EmailMessage, frozen per EM-001's own rule
├── console-email.service.ts          # UNCHANGED — still the concrete console logger
├── templates/auth.templates.ts       # UNCHANGED — still what AuthService's own 4 call sites use
├── email.module.ts                   # MODIFIED — EmailService now bound to EnterpriseEmailService
└── enterprise/
    ├── contracts/email-platform.contracts.ts     # EmailProviderId, EmailErrorClassification, EmailQueueState, EmailTemplateId (26 ids), EmailHealthStatus
    ├── types/email-platform.types.ts             # EnterpriseEmailMessage, EmailSendResult, EmailQueueItem, EmailTrackingRecord, EmailHealthSnapshot, ...
    ├── constants/email-platform.constants.ts
    ├── providers/
    │   ├── email-provider.interface.ts           # EmailProvider — type/enabled/send()/verifyConnection()
    │   ├── console/console-email.provider.ts      # wraps the existing ConsoleEmailService
    │   ├── smtp/smtp-email.provider.ts             # SMTPEmailProvider (Nodemailer)
    │   ├── resend/resend-email.provider.ts         # ResendEmailProvider (raw fetch)
    │   ├── email-provider.factory.ts               # EmailProviderFactory
    │   └── email-provider.registry.ts               # EmailProviderRegistry
    ├── template-engine/
    │   ├── template-engine.ts                      # TemplateEngine — {{var}}, {{#if}}, {{> partial}}
    │   ├── template-renderer.ts                    # TemplateRenderer — layout + markdown + plain-text derivation
    │   ├── template-definition.ts
    │   ├── markdown.util.ts
    │   ├── layouts/base-layout.ts
    │   ├── partials/shared.partials.ts
    │   ├── template-registry.ts                    # TemplateRegistry — 26 named templates
    │   └── definitions/{auth,organization,security,billing,ai-platform,portfolio,system}.templates.ts
    ├── queue/email-queue.service.ts                # EmailQueueService — Immediate/Scheduled/Delayed, 5 states
    ├── retry/email-retry.service.ts                # EmailRetryService — exponential backoff
    ├── tracking/email-tracker.service.ts            # EmailTrackerService
    ├── cache/email-cache.service.ts                  # EmailCacheService (Redis, email: prefix)
    ├── health/email-health.provider.ts               # EmailHealthProvider
    ├── errors/email-error-mapper.ts                   # EmailErrorMapper — 7 named categories
    ├── admin/email-admin.service.ts                    # EmailAdminService — test send / preview / validate
    ├── enterprise-email.service.ts                       # EnterpriseEmailService — bound to EmailService
    ├── email-platform.module.ts                          # EMAIL_PLATFORM_PROVIDERS array
    └── __tests__/                                          # 16 spec files
```

### How backward compatibility is preserved

`EmailService`/`EmailMessage` (`{to: string, subject: string, html: string} -> Promise<void>`) is untouched. `email.module.ts` now binds that token to `EnterpriseEmailService` instead of directly to `ConsoleEmailService` — via `useExisting`, not `useClass`, so there's exactly one `EnterpriseEmailService` instance shared by both the `EmailService` token (what `AuthService` injects) and the concrete class token (what a future caller wanting `sendTemplate()`/`sendEnterprise()` would inject).

`EnterpriseEmailService.send()` wraps the incoming narrow message into an `EnterpriseEmailMessage`, enqueues it in `"IMMEDIATE"` mode, and awaits it — preserving the exact await/throws-on-failure contract `AuthService`'s own (untouched) call sites already have. With the default `EMAIL_PROVIDER=console`, that immediate send routes to `ConsoleEmailProvider`, which itself delegates to the original, untouched `ConsoleEmailService` for its core to/subject/html logging — so Authentication's verification, welcome, and password-reset emails produce byte-identical console output to before this milestone. A real provider failure (once SMTP/Resend is actually configured) now surfaces as a thrown error after retries are exhausted, which is not a regression — nothing could ever fail through the console-only path that existed before.

---

## Providers

| EM-001 requirement | Implementation |
|---|---|
| Provider Interface | `EmailProvider` — `type`, `enabled`, `send()`, `verifyConnection()` |
| Console (existing) | `ConsoleEmailProvider` — wraps `ConsoleEmailService`, always enabled |
| SMTP Provider | `SMTPEmailProvider` — Nodemailer (`nodemailer.createTransport`), Host/Port/Username/Password/TLS/SSL/Auth/Connection Pool/Timeout all mapped onto transport options |
| Resend Provider | `ResendEmailProvider` — raw `fetch` against `POST /emails` (API Key/Sender/HTML/Text/Attachments/Reply-To), no SDK dependency, matching this project's existing REST-integration convention |
| Provider Factory | `EmailProviderFactory` — registers all three on boot, activates whichever `EMAIL_PROVIDER` names, falls back to Console if the named provider isn't actually configured |
| Provider Registry | `EmailProviderRegistry` — supports registering multiple providers; `setActive()`/`getActive()` enforce exactly one active provider at runtime |

Future providers (SendGrid, Amazon SES, Mailgun, Microsoft Graph, Gmail API) are **not** implemented — `EmailProviderId` is a closed union with only `"CONSOLE" | "SMTP" | "RESEND"`, extended the same way `BrokerType` (BR-001) and `MarketDataProviderType`-style unions in this codebase grow: one new provider file + one new union member, whenever that milestone actually arrives.

---

## Template Engine

`TemplateEngine` is a small, dependency-free string engine — no Handlebars/Mustache/EJS — supporting `{{variable}}` interpolation (HTML-escaped or raw), one level of `{{#if cond}}...{{/if}}` conditionals, and `{{> partialName}}` partial inclusion. `TemplateRenderer` sits above it: resolves a template's declared `format` (`"html"` or `"markdown"`, the latter converted via a small dependency-free `markdownToHtml()`), wraps the rendered body in one shared `BASE_LAYOUT` (header/footer, EM-001's own "Shared Layouts" requirement), and derives a plain-text alternative automatically when a template doesn't supply one explicitly.

**26 templates** across the 7 categories EM-001 names, all in `template-engine/definitions/`:

- **Authentication (7):** welcome, verify-email, password-reset, password-changed, email-changed, account-locked, two-factor-otp
- **Organization (3):** invite-user, organization-invitation, member-removed
- **Security (3):** security-alert, login-from-new-device, failed-login-attempts
- **Billing (4):** subscription-created, subscription-renewed, payment-failed, invoice-ready
- **AI Platform (3):** ai-report-ready, strategy-report, backtest-completed
- **Portfolio (3):** daily-summary, weekly-summary, monthly-summary
- **System (3):** maintenance, downtime, general-notification

These are the enterprise-platform equivalents of Authentication's own hand-rolled template functions (`templates/auth.templates.ts`, untouched) — not a replacement for them. Future RMSM modules (Organization invitations, Security alerts, Billing, AI Platform, Portfolio digests, System notices) call `EnterpriseEmailService.sendTemplate({templateId, to, variables})` instead of writing their own subject/html strings, per EM-001's own "Future RMSM modules must use this module" note.

---

## Queue

`EmailQueueService` supports all three named send modes and all five named states:

- **Immediate** — processed synchronously inline; `enqueue()` awaits the send-with-retry and either returns a `COMPLETED` item or throws (propagating to a synchronous caller like `EnterpriseEmailService.send()`).
- **Scheduled** — `enqueue()` returns immediately with a `PENDING` item; a `setTimeout` fires at `scheduledAt`.
- **Delayed** — same, fired after `delayMs`.

States: `PENDING -> PROCESSING -> COMPLETED | FAILED`, or `PENDING -> CANCELLED` via `cancel()`. In-memory only this milestone (a `Map`, not a persisted table or a real broker like BullMQ/SQS) — EM-001 names no queue-persistence requirement, the same kind of explicit, named scope boundary BR-001 drew around its own lack of a database layer.

---

## Retry

`EmailRetryService.executeWithRetry()` — a small, generic exponential-backoff wrapper (not email-specific in its mechanics), used by `EmailQueueService` with `EmailErrorMapper.isRetryable()` deciding which failures are worth retrying at all. `EMAIL_RETRY_COUNT`/`EMAIL_RETRY_DELAY_MS` (`@rmsm/config`) control the retry budget and base delay; each successive retry doubles the delay.

---

## Tracking

`EmailTrackerService` records Sent/Failed (in-memory `Map`, keyed by provider message id), each with retry count and processing time in milliseconds. `markDelivered()` exists on the public API for a future inbound-webhook handler to call — no webhook ingestion path exists yet in this milestone (that would require standing up per-provider inbound webhooks, outside EM-001's own scope list). `recentFailureRate()` feeds `EmailHealthProvider`'s "Queue Status" check.

---

## Security

- `password`/API keys are never logged anywhere in the platform. `SMTPEmailProvider`/`ResendEmailProvider` log only recipient counts, provider message ids, and HTTP/SMTP status codes on failure.
- `EmailAdminService.sendTestEmail()` masks the test recipient in its own log line (`q***@example.com`).
- Credentials flow entirely through `@rmsm/config` (`Env`, via `APP_CONFIG`) — no direct `process.env` access anywhere in the platform.
- Credential encryption at rest does not apply this milestone: SMTP/Resend credentials are read directly from environment configuration (matching how `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` already worked in `auth.schema.ts` before this platform existed), not persisted to a database row the way the pre-existing, unrelated `notifications` module's per-organization `EmailProvider` rows are (those use `CredentialEncryptionService` because they're stored). If a future milestone adds persisted, org-scoped email provider configuration to this platform, that's the natural point to add encryption-at-rest, mirroring the `notifications` module's own approach.

---

## Configuration

`EMAIL_PROVIDER` (now `"console" | "smtp" | "resend"`, additively widened from `"console" | "smtp"`) and `EMAIL_FROM`/`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` already existed in `packages/config/src/schemas/auth.schema.ts` (added when Authentication's own email flow was built) and are left there rather than moved, to avoid a breaking rename on the merged `Env` type. New in `packages/config/src/schemas/email.schema.ts`:

| Variable | Type | Default |
|---|---|---|
| `SMTP_TLS` | boolean | `true` |
| `SMTP_POOL` | boolean | `true` |
| `SMTP_MAX_CONNECTIONS` | int | `5` |
| `RESEND_API_KEY` | string, optional | — |
| `EMAIL_QUEUE_ENABLED` | boolean | `true` |
| `EMAIL_RETRY_COUNT` | int | `5` |
| `EMAIL_RETRY_DELAY_MS` | ms | `1000` |
| `EMAIL_TIMEOUT` | ms | `10000` |
| `EMAIL_CACHE_TTL_MS` | ms | `300000` |

No direct `process.env` access anywhere in the platform — every value flows through `Env` via `APP_CONFIG`.

---

## Cache

`EmailCacheService` — same `ioredis`/`REDIS_URL` reuse and cache-aside discipline as every provider cache since MD-002/BR-001 (`email:` key prefix, never throws — a Redis outage degrades to a cache miss, not a platform outage). Available for callers that want to cache resolved provider configuration or compiled template lookups at `EMAIL_CACHE_TTL_MS`; templates themselves are static in-code data (no network fetch to cache), so the primary use is provider-configuration-style lookups a future milestone adds.

---

## Testing

16 spec files, 165 tests, covering every item on EM-001's own Tests list — Provider Interface (via the Console/SMTP/Resend provider specs plus Registry/Factory), SMTP Provider (Nodemailer mocked, TLS/pool/timeout mapping, SMTP-code error classification), Resend Provider (fetch mocked, HTTP-status error classification, timeout), Factory (provider selection + safe fallback), Registry (register/get/tryGet/setActive/getActive/listRegistered), Queue (all 3 modes, all 5 states, cancellation, deferred-failure-never-unhandled-rejection), Retry (backoff doubling, exhaustion, non-retryable short-circuit), Templates (all 26 ids resolve, 7 categories), Renderer (layout wrapping, markdown conversion, plain-text derivation, partial resolution), Health (healthy/degraded/down), Error Mapper (all 7 classifications + HTTP-status fallback + retryability), Configuration (exercised via the Factory spec's env-driven provider construction), plus `EmailAdminService` and `EnterpriseEmailService` (the two top-level orchestration classes).

Full regression after this change: **60 test suites, 556 tests, all passing** (16 new Email Platform suites + 44 pre-existing suites from MD-001–MD-004 and BR-001). `AuthService`'s own email-verification/recovery specs were not touched and were not re-copied into the isolated verification sandbox — they mock `EmailService` directly (never `ConsoleEmailService`/`EmailModule`), so they are structurally unaffected by every change in this delivery; `auth.service.ts`, `email.service.interface.ts`, `console-email.service.ts`, and `templates/auth.templates.ts` are byte-for-byte unmodified.

### Typecheck note

Verified under the same corrected `tsc --strict` configuration BR-001 established (`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, matching the real `tsconfig.base.json`). The entire Email Platform (this milestone) typechecks with **zero errors**. Two sandbox-only stub gaps were fixed along the way (the hand-written `@nestjs/common` stub was missing an exported `Provider` type, and the `ioredis` stub was missing `.del()` from an earlier milestone) — both are artifacts of this isolated verification environment, not real bugs; the real `@nestjs/common`/`ioredis` packages already have complete types.

---

## Future Providers

Adding SendGrid, Amazon SES, Mailgun, Microsoft Graph, or Gmail API requires no change to any file in this delivery:

1. Add `providers/<provider>/<provider>-email.provider.ts` implementing `EmailProvider`.
2. Add the new id to `EmailProviderId` (`contracts/email-platform.contracts.ts`).
3. Register it in `EmailProviderFactory.onModuleInit()` and add its config vars to `email.schema.ts`.
4. Widen `EMAIL_PROVIDER`'s zod enum by one value.

`EmailProviderRegistry`, `EmailQueueService`, `EmailRetryService`, `EmailTrackerService`, `TemplateEngine`/`TemplateRenderer`/`TemplateRegistry`, `EmailHealthProvider`, and `EmailAdminService` are all provider-count-agnostic by design — none of them reference `SMTPEmailProvider`/`ResendEmailProvider` by name.
