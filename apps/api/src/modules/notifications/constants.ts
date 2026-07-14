import type { OrganizationRole } from "@rmsm/database";

/** Reuses Module 003's OrganizationRoleGuard/@RequireOrgRole exactly — notification actions are gated by the same per-organization roles as organizations/billing, not a parallel role system. */
export const NOTIFICATION_SEND_ROLES: OrganizationRole[] = ["OWNER", "ADMINISTRATOR", "MANAGER"];
export const NOTIFICATION_READ_ROLES: OrganizationRole[] = [
  "OWNER",
  "ADMINISTRATOR",
  "MANAGER",
  "ANALYST",
  "TRADER",
  "VIEWER",
];
export const NOTIFICATION_TEMPLATE_MANAGE_ROLES: OrganizationRole[] = ["OWNER", "ADMINISTRATOR"];
