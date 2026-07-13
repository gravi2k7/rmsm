# Module 005 — Phase 2b: Providers & Dispatch Infrastructure

Status: Complete — Awaiting Approval Before Phase 2c (Services)

11 provider adapters (5 email, 4 SMS, 2 push), 3 registries, a credential-decryption factory,
a real template engine, and a BullMQ-backed queue adapter. Every adapter is implemented against
its provider's actual REST/protocol documentation directly — no vendor SDK anywhere in this
module, the same discipline as every provider integration since Module 002.

## 1. A Real Bug in My Own Phase 1 Interface, Found Building This For Real

`IProviderRegistry.get()`/`getDefault()` were declared **synchronous** in Phase 1. Building the
email registry for real exposed why that's wrong: Module 004's payment providers each had
exactly one platform-wide instance, constructed once at DI-container startup from static env
config — a synchronous map lookup was correct for that. Module 005's providers are explicitly
**per-organization configurable** (`EmailProvider.organizationId`, credentials stored per-row),
so resolving "the SendGrid adapter for organization X" is a database lookup before it's an
adapter construction — inherently async. Fixed the interface before any registry implementation
depended on the wrong signature, the same class of correction as Module 004's PayPal
`verifyWebhookSignature` fix in Phase 3a. Flagged, not silently patched.

## 2. What Was Actually Built

**Email** (`providers/email/`): `SmtpEmailProvider` (a genuine SMTP client over raw `net`/`tls`
sockets — EHLO, STARTTLS, AUTH LOGIN, MAIL FROM/RCPT TO/DATA with dot-stuffing, multi-line
response parsing; no `nodemailer`), `SesEmailProvider` (AWS SigV4-signed `SendRawEmail`),
`SendGridEmailProvider` (ECDSA webhook verification), `MailgunEmailProvider`,
`ResendEmailProvider` (Svix-based webhook verification), `EmailProviderRegistry`.

**SMS** (`providers/sms/`): `TwilioProvider` (HMAC-SHA1 URL+params webhook signing),
`MessageBirdProvider`, `VonageProvider`, `AwsSnsProvider` (reuses the same SigV4 helper as SES),
`SmsProviderRegistry`.

**Push** (`providers/push/`): `FcmPushProvider` (Google OAuth2 service-account JWT-bearer flow,
RS256-signed, cached token), `ApnsPushProvider` (Node's `http2` module — mandatory for Apple's
API, unlike every other provider here which uses plain `fetch`/HTTP1.1 — ES256-signed token
auth), `PushProviderRegistry`.

**Shared infrastructure** (`providers/shared/`): `aws-sigv4.ts` (one signing implementation,
used by both SES and SNS — not duplicated), `mime-builder.ts` (one MIME/RFC 5322 builder, used
by SMTP and SES's raw-message API), `jwt-sign.ts` (RS256/ES256 signing, used by FCM and APNs),
`credential-encryption.ts` (AES-256-GCM, mirroring Module 002's `TwoFactorService` pattern).

**`ProviderFactory`**: the only component that ever decrypts credentials; constructs the
correct adapter via `new` (not NestJS DI — see Section 4).

**`RmsmTemplateEngine`**: a real, hand-implemented engine supporting variables, nested-path
access, `{{#if}}/{{else}}`, and `{{#each}}` — including correct nested-block handling (an
`{{#if}}` inside an `{{#each}}` and vice versa), verified by 14 new unit tests, not just
asserted in a comment. Explicitly does *not* support comparison operators or helper functions;
documented as a real, intentional scope boundary, not a hidden gap — swapping in Handlebars
later is a contained one-file change since every caller depends on the `TemplateEngine`
interface.

**`BullMqQueueAdapter`**: registers 5 named queues (`email`/`sms`/`push`/`digest`/`scheduled`)
against Module 001's existing global BullMQ/Redis connection — no second Redis connection
(ADR-017).

## 3. Two Simplifications, Named Rather Than Presented as Full Implementations

- **SES and SNS bounce/delivery notifications arrive via SNS**, which signs with a
  certificate-based scheme, not a fixed shared secret. Both `SesEmailProvider` and
  `AwsSnsProvider` verify using a simpler pre-shared-secret HMAC instead of SNS's native
  certificate verification — documented in both files as a deliberate simplification, the same
  honesty standard as Module 004's PayPal webhook verification write-up.
- **APNs/FCM invalid-token handling** returns a `PushInvalidTokenError` shape for known
  failure reasons (`BadDeviceToken`/`Unregistered` for APNs, `NOT_FOUND`/`INVALID_ARGUMENT` for
  FCM) — other failure types still throw. This covers the specific case
  `DeviceTokenRepository.deactivate()` (Phase 2a) needs to act on, not every conceivable
  provider error.

## 4. Why the 11 Provider Classes Aren't NestJS `@Injectable()` Providers

Caught this myself mid-phase: I'd initially decorated all 11 adapter classes `@Injectable()`
out of habit, even though `ProviderFactory` always constructs them via `new X(credentials)`
with plain decrypted-credential objects — never through NestJS's DI container. A decorator that
implies dependency injection will never actually happen is misleading, not harmless. Removed
from all 11 before this phase shipped; the three registries (which genuinely are DI-managed,
taking injected repositories/factory as constructor params) correctly keep it.

## 5. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`, `@rmsm/config`) | ✅ 0 errors (2 real `no-control-regex` findings in the quoted-printable encoder, fixed with justified disables — the control-character matching is the algorithm's correct behavior, not an accident) |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/config`, `@rmsm/api`) | ✅ 0 errors (6 real `noUncheckedIndexedAccess` strict-mode errors found and fixed — regex capture groups and destructured array elements that are genuinely `string \| undefined` under this project's strict TS config, not previously exercised by any prior module's code shape) |
| New template engine tests | ✅ **14/14 actually executed and passing** (pure logic, no `@rmsm/database` import — runs cleanly without needing the mocking pattern ADR-019 established, since it has no persistence dependency at all) |
| Existing unit tests | ✅ 32/32 unaffected |
| TODO/placeholder/bare-`any` scan | ✅ none found |

## 6. What's Deferred to Phase 2c

14 services (`NotificationService`, `EmailService`, `SmsService`, `PushService`,
`WebhookService`, `QueueService`, `TemplateService`, `PreferenceService`, `DeliveryService`,
`NotificationScheduler`, `DigestService`, `TrackingService` — `ProviderRegistry`/
`ProviderFactory` are effectively complete as of this phase, per Phase 1's contracts) —
orchestrating everything built in Phases 2a/2b, opening transactions where multi-repository
atomicity is needed, and calling `AuditService` for every mutation per the Phase 2a-confirmed
architecture standard.

---

**Awaiting your review before Phase 2c (Services).**
