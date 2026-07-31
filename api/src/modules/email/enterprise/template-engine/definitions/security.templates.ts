import type { TemplateDefinition } from "../template-definition";

export const SECURITY_TEMPLATES: TemplateDefinition[] = [
  {
    id: "security-alert",
    category: "Security",
    format: "html",
    subject: "Security alert on your RMSM account",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Security alert</h1><p>We noticed the following security event on your account: <strong>{{event}}</strong>.</p>{{#if ipAddress}}<p>IP address: {{ipAddress}}</p>{{/if}}<p>If this wasn't you, reset your password immediately.</p>`,
    sampleVariables: { event: "New API key created", ipAddress: "203.0.113.4" },
  },
  {
    id: "login-from-new-device",
    category: "Security",
    format: "html",
    subject: "New sign-in to your RMSM account",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">New device sign-in</h1><p>We noticed a sign-in from a new device.</p><p>Device: {{deviceName}}<br />Location: {{location}}<br />Time: {{signedInAt}}</p><p>If this wasn't you, secure your account immediately.</p>`,
    sampleVariables: { deviceName: "Chrome on macOS", location: "San Francisco, US", signedInAt: "2026-07-31 14:00 UTC" },
  },
  {
    id: "failed-login-attempts",
    category: "Security",
    format: "html",
    subject: "Multiple failed sign-in attempts on your RMSM account",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Failed sign-in attempts</h1><p>We detected {{attemptCount}} failed sign-in attempts on your account within the last {{windowMinutes}} minutes.</p><p>If this wasn't you, consider changing your password.</p>`,
    sampleVariables: { attemptCount: "3", windowMinutes: "15" },
  },
];
