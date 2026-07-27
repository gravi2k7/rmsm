/** Matches InviteMemberDto's allowed values (OWNER excluded — ownership only
 * moves via a dedicated transfer-ownership flow, never a direct invite). */
export const INVITABLE_ORG_ROLES = ["ADMINISTRATOR", "MANAGER", "ANALYST", "TRADER", "VIEWER"] as const;
export type InvitableOrgRole = (typeof INVITABLE_ORG_ROLES)[number];
export type OrganizationRole = InvitableOrgRole | "OWNER";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "EXPIRED";

/** Mirrors @rmsm/database's OrganizationInvitation model (see
 * apps/api/src/modules/organizations/repositories/invitation.repository.ts). */
export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  status: InvitationStatus;
  invitedById: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValidateInvitationResult {
  valid: boolean;
  organizationName?: string;
  role?: OrganizationRole;
  email?: string;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  status: string;
}
