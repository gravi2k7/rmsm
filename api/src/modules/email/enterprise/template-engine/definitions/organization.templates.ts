import type { TemplateDefinition } from "../template-definition";

export const ORGANIZATION_TEMPLATES: TemplateDefinition[] = [
  {
    id: "invite-user",
    category: "Organization",
    format: "html",
    subject: "{{inviterName}} invited you to join {{organizationName}} on RMSM",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">You've been invited</h1><p>{{inviterName}} invited you to join <strong>{{organizationName}}</strong> on RMSM as a {{role}}.</p><p style="margin:24px 0;">{{> button}}</p>`,
    sampleVariables: { inviterName: "Alex Chen", organizationName: "Acme Capital", role: "Analyst", actionUrl: "https://app.rmsm.ai/invite/accept?token=...", actionLabel: "Accept Invitation" },
  },
  {
    id: "organization-invitation",
    category: "Organization",
    format: "html",
    subject: "Your invitation to {{organizationName}} is ready",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Invitation ready</h1><p>Your invitation to join <strong>{{organizationName}}</strong> is ready. It expires on {{expiresAt}}.</p><p style="margin:24px 0;">{{> button}}</p>`,
    sampleVariables: { organizationName: "Acme Capital", expiresAt: "2026-08-07", actionUrl: "https://app.rmsm.ai/invite/accept?token=...", actionLabel: "View Invitation" },
  },
  {
    id: "member-removed",
    category: "Organization",
    format: "html",
    subject: "You've been removed from {{organizationName}}",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Membership ended</h1><p>You've been removed from <strong>{{organizationName}}</strong> by {{removedByName}}.</p><p>If you believe this was a mistake, contact {{organizationName}}'s administrator.</p>`,
    sampleVariables: { organizationName: "Acme Capital", removedByName: "Alex Chen" },
  },
];
