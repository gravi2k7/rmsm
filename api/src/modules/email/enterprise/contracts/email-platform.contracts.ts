/**
 * EM-001 — the Enterprise Email Platform's own small vocabulary,
 * independent of `api/src/modules/notifications`' pre-existing (and
 * unrelated) `EmailProviderType`/`EmailProviderAdapter` system — see
 * `email-platform.module.ts`'s own doc comment for why these two stay
 * separate rather than merged. Modeled the same way BR-001's
 * `contracts/broker.contracts.ts` modeled its own domain vocabulary:
 * plain string-literal unions, no dependency on any provider SDK.
 */

/** Only the providers this milestone implements. Deliberately NOT a superset
 * that includes SendGrid/SES/Mailgun/Microsoft Graph/Gmail — EM-001's own
 * "Do NOT implement future providers" rule means those aren't given a
 * union member until the milestone that actually implements them does,
 * exactly like BR-001's `BrokerType` only grew as brokers were built. */
export type EmailProviderId = "CONSOLE" | "SMTP" | "RESEND";

export type EmailErrorClassification =
  | "smtp_failure"
  | "authentication_failure"
  | "timeout"
  | "invalid_recipient"
  | "provider_unavailable"
  | "rate_limit"
  | "queue_failure"
  | "unknown";

export type EmailQueueState = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type EmailSendMode = "IMMEDIATE" | "SCHEDULED" | "DELAYED";

export type EmailHealthStatus = "healthy" | "degraded" | "down" | "unknown";

/** BR-001's own Market Service timeframe list is the naming precedent for
 * an explicit, closed union rather than `string` — every named EM-001
 * template lives here, grouped exactly as EM-001's own "Templates"
 * section groups them, so `TemplateRegistry` and `EmailAdminService`'s
 * preview feature can enumerate every valid id without a magic string. */
export type EmailTemplateId =
  // Authentication
  | "welcome"
  | "verify-email"
  | "password-reset"
  | "password-changed"
  | "email-changed"
  | "account-locked"
  | "two-factor-otp"
  // Organization
  | "invite-user"
  | "organization-invitation"
  | "member-removed"
  // Security
  | "security-alert"
  | "login-from-new-device"
  | "failed-login-attempts"
  // Billing
  | "subscription-created"
  | "subscription-renewed"
  | "payment-failed"
  | "invoice-ready"
  // AI Platform
  | "ai-report-ready"
  | "strategy-report"
  | "backtest-completed"
  // Portfolio
  | "daily-summary"
  | "weekly-summary"
  | "monthly-summary"
  // System
  | "maintenance"
  | "downtime"
  | "general-notification";
