import { randomBytes, createHash } from "crypto";
import { prisma, OrganizationInvitation, OrganizationRole, InvitationStatus } from "@rmsm/database";

/**
 * Creates a real, persisted invitation with a KNOWN raw token returned
 * alongside it — production code only ever stores the hash (per ADR-008),
 * but tests need the raw token to exercise accept/decline/validate
 * end-to-end, exactly as a real invitee would receive it by email.
 */
export async function createTestInvitation(
  organizationId: string,
  email: string,
  role: OrganizationRole,
  invitedById: string,
  overrides: { status?: InvitationStatus; expiresAt?: Date } = {},
): Promise<{ invitation: OrganizationInvitation; rawToken: string }> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const invitation = await prisma.organizationInvitation.create({
    data: {
      organizationId,
      email,
      role,
      tokenHash,
      invitedById,
      status: overrides.status ?? "PENDING",
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { invitation, rawToken };
}
