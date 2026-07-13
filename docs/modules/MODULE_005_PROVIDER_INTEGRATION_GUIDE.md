# Module 005 — Provider Integration Guide

Written now, in Phase 1, so Phase 2's implementations have a concrete target — the same
approach Module 004 took delivering `PAYMENT_PROVIDER_CONFIGURATION.md` before any provider
adapter existed. Every provider here follows the same rule established across this project:
**no provider SDK dependency** — Phase 2 implements each adapter against the provider's REST
API directly via `fetch`, exactly like Module 002's OAuth providers and Module 004's payment
providers.

## Email

| Provider | Auth scheme | Webhook signature scheme |
|---|---|---|
| SMTP | Username/password (encrypted) | N/A — no webhook concept for raw SMTP; bounce handling needs a separate mechanism (e.g. a catch-all mailbox), out of scope for Phase 2's first pass |
| Amazon SES | AWS SigV4 (access key + secret) | SNS-delivered notifications, verified via SNS message signature |
| SendGrid | Bearer API key | HMAC-SHA256 (`X-Twilio-Email-Event-Webhook-Signature` header) |
| Mailgun | Basic auth (API key) | HMAC-SHA256 over `timestamp + token` |
| Resend | Bearer API key | Svix-based signing (`svix-signature` header) |

Every non-SMTP provider above supports delivery/bounce/open/click webhooks — the exact shape
`EmailProviderAdapter.parseWebhookEvent()` (Phase 1's interface) needs each implementation to
normalize into.

## SMS

| Provider | Auth scheme | Webhook signature scheme |
|---|---|---|
| Twilio | Basic auth (Account SID + Auth Token) | HMAC-SHA1 over the full request URL + sorted params (`X-Twilio-Signature`) |
| MessageBird | Bearer access key | HMAC-SHA256 (`MessageBird-Signature` header) |
| Vonage | Basic auth or JWT | HMAC-SHA256 signed params |
| AWS SNS | AWS SigV4 | SNS message signature (same scheme as SES above) |

## Push

| Provider | Auth scheme | Notes |
|---|---|---|
| Firebase Cloud Messaging (FCM) | OAuth2 service account (JSON key) | HTTP v1 API; no inbound webhook — delivery/failure is synchronous in the send response (`PushInvalidTokenError` in Phase 1's interface) |
| Apple Push Notification Service (APNs) | Token-based auth (`.p8` key + Key ID + Team ID) via JWT | HTTP/2 required; invalid-token responses (410 Gone) map to the same `PushInvalidTokenError` shape |

## Credential Storage

Every provider's credentials are stored in `credentialsEnc` (AES-256-GCM encrypted), the same
approach as Module 002's `TwoFactorSecret.secretEnc`. Phase 2's `ProviderFactory` is the only
component that ever decrypts them, immediately before constructing an adapter instance —
credentials never appear in logs, `NotificationLog.metadata`, or any API response.

## Environment Variables (Phase 2 will need)

```bash
# Encryption key for all provider credentials in this module — reuse
# Module 002's TWO_FACTOR_ENCRYPTION_KEY pattern (a new, separate key,
# not the literal same value) rather than inventing a different scheme.
NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY=

# Platform-default providers (organizationId = NULL rows) — every
# organization without its own configured provider falls back to these.
DEFAULT_EMAIL_PROVIDER_TYPE=SMTP   # or SES, SENDGRID, MAILGUN, RESEND
DEFAULT_SMS_PROVIDER_TYPE=TWILIO   # or MESSAGEBIRD, VONAGE, AWS_SNS
DEFAULT_PUSH_PROVIDER_TYPE=FCM     # or APNS

# Per-provider credentials — Phase 2 will define the exact key set per
# provider type (mirroring Module 004's STRIPE_SECRET_KEY /
# STRIPE_WEBHOOK_SECRET pattern), not enumerated here since none of these
# are implemented yet and guessing exact key names before writing the
# adapter risks them not matching what the adapter actually needs.
```

## Provider Failover

The spec's "Provider failover" requirement maps to `IDeliveryService.getFailoverOrder()`
(Phase 1's interface) — if an organization has multiple active providers configured for one
channel, a failed send against the default provider triggers a retry against the next one in
order, before the notification is marked FAILED. This is Phase 2 implementation work; the
interface contract for it already exists.
