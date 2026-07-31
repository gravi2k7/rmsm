import type { TemplateDefinition } from "../template-definition";

/**
 * EM-001's own "Authentication" template group. NOT used by
 * `AuthService` today — `../../../templates/auth.templates.ts` (plain
 * functions, untouched by this milestone) remains the source of truth
 * for the emails Authentication actually sends, per EM-001's own "Do NOT
 * modify Authentication"/"Do NOT break existing verification emails"
 * rules. These are the enterprise-platform equivalents future callers
 * (and `EmailAdminService.previewTemplate()`) use going forward.
 */
export const AUTH_TEMPLATES: TemplateDefinition[] = [
  {
    id: "welcome",
    category: "Authentication",
    format: "html",
    subject: "Welcome to RMSM, {{name}}",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Welcome, {{name}}!</h1><p>Your account is verified and ready to go.</p>{{#if organizationName}}<p>You're now part of <strong>{{organizationName}}</strong>.</p>{{/if}}`,
    sampleVariables: { name: "Jordan", organizationName: "Acme Capital" },
  },
  {
    id: "verify-email",
    category: "Authentication",
    format: "html",
    subject: "Verify your RMSM email address",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Confirm your email</h1><p>Hi {{name}}, please verify your email address to activate your RMSM account.</p><p style="margin:24px 0;">{{> button}}</p><p style="font-size:12px;color:#6b7280;">This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>`,
    sampleVariables: { name: "Jordan", actionUrl: "https://app.rmsm.ai/verify-email?token=...", actionLabel: "Verify Email" },
  },
  {
    id: "password-reset",
    category: "Authentication",
    format: "html",
    subject: "Reset your RMSM password",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Reset your password</h1><p>We received a request to reset your password.</p><p style="margin:24px 0;">{{> button}}</p><p style="font-size:12px;color:#6b7280;">If you didn't request this, you can safely ignore this email — your password will not change.</p>`,
    sampleVariables: { actionUrl: "https://app.rmsm.ai/reset-password?token=...", actionLabel: "Reset Password" },
  },
  {
    id: "password-changed",
    category: "Authentication",
    format: "html",
    subject: "Your RMSM password was changed",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Password changed</h1><p>Your password was changed on {{changedAt}}.{{#if ipAddress}} (IP: {{ipAddress}}){{/if}}</p><p>If this wasn't you, contact support immediately.</p>`,
    sampleVariables: { changedAt: "2026-07-31 14:00 UTC", ipAddress: "203.0.113.4" },
  },
  {
    id: "email-changed",
    category: "Authentication",
    format: "html",
    subject: "Your RMSM account email was changed",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Email address changed</h1><p>Your account email was changed from {{oldEmail}} to {{newEmail}}.</p><p>If you didn't make this change, contact support immediately.</p>`,
    sampleVariables: { oldEmail: "old@example.com", newEmail: "new@example.com" },
  },
  {
    id: "account-locked",
    category: "Authentication",
    format: "html",
    subject: "Your RMSM account has been locked",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Account locked</h1><p>Your account was locked after {{attemptCount}} failed sign-in attempts.</p><p>{{#if unlockUrl}}<p style="margin:24px 0;">{{> button}}</p>{{/if}}</p>`,
    sampleVariables: { attemptCount: "5", unlockUrl: "https://app.rmsm.ai/unlock", actionUrl: "https://app.rmsm.ai/unlock", actionLabel: "Unlock Account" },
  },
  {
    id: "two-factor-otp",
    category: "Authentication",
    format: "html",
    subject: "Your RMSM verification code",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Your verification code</h1><p style="font-size:32px;font-weight:bold;letter-spacing:4px;margin:24px 0;">{{otp}}</p><p>This code expires in {{expiresInMinutes}} minutes. Never share this code with anyone.</p>`,
    sampleVariables: { otp: "482913", expiresInMinutes: "10" },
  },
];
