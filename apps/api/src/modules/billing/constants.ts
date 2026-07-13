import type { OrganizationRole } from "@rmsm/database";

/** Reuses Module 003's OrganizationRoleGuard/@RequireOrgRole exactly — billing actions are gated by the same per-organization roles as everything else, not a parallel role system. */
export const BILLING_MANAGE_ROLES: OrganizationRole[] = ["OWNER", "ADMINISTRATOR"];
export const BILLING_READ_ROLES: OrganizationRole[] = [
  "OWNER",
  "ADMINISTRATOR",
  "MANAGER",
  "ANALYST",
  "TRADER",
  "VIEWER",
];
