export const EMAIL_DEFAULT_TIMEOUT_MS = 10_000;
export const EMAIL_DEFAULT_RETRY_COUNT = 5;
export const EMAIL_DEFAULT_RETRY_DELAY_MS = 1_000;
export const EMAIL_DEFAULT_QUEUE_ENABLED = true;
export const EMAIL_DEFAULT_CACHE_TTL_MS = 300_000; // 5 minutes — templates/provider config change rarely.
export const EMAIL_HEALTH_CHECK_RECIPIENT_PLACEHOLDER = "healthcheck@rmsm.local";

/** Every `EmailTemplateId` this milestone ships, grouped exactly as EM-001's own "Templates" section — used by `TemplateRegistry`/`EmailAdminService.previewTemplate()` to enumerate valid ids without scattering the list across files. */
export const EMAIL_TEMPLATE_IDS = [
  "welcome",
  "verify-email",
  "password-reset",
  "password-changed",
  "email-changed",
  "account-locked",
  "two-factor-otp",
  "invite-user",
  "organization-invitation",
  "member-removed",
  "security-alert",
  "login-from-new-device",
  "failed-login-attempts",
  "subscription-created",
  "subscription-renewed",
  "payment-failed",
  "invoice-ready",
  "ai-report-ready",
  "strategy-report",
  "backtest-completed",
  "daily-summary",
  "weekly-summary",
  "monthly-summary",
  "maintenance",
  "downtime",
  "general-notification",
] as const;
