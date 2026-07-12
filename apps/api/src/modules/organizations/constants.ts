import type { OrganizationRole } from "@rmsm/database";

export const ALL_ORG_ROLES: OrganizationRole[] = [
  "OWNER",
  "ADMINISTRATOR",
  "MANAGER",
  "ANALYST",
  "TRADER",
  "VIEWER",
];
export const MANAGEMENT_ORG_ROLES: OrganizationRole[] = ["OWNER", "ADMINISTRATOR", "MANAGER"];
export const ADMIN_ORG_ROLES: OrganizationRole[] = ["OWNER", "ADMINISTRATOR"];
export const OWNER_ONLY_ORG_ROLE: OrganizationRole[] = ["OWNER"];
