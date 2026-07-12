import { Injectable } from "@nestjs/common";
import {
  prisma,
  OrganizationMembership,
  OrganizationMembershipWithUser,
  OrganizationMembershipWithOrganization,
  OrganizationRole,
  MembershipStatus,
  DbClient,
} from "@rmsm/database";

export interface CreateMembershipInput {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  invitedById?: string;
}

/**
 * Repository Pattern — single table (`organization_memberships`) only.
 * Deliberately has NO `transferOwnership()` method: transferring ownership
 * touches two rows (old + new owner) and must be composed inside a single
 * `prisma.$transaction` by the service layer, which also owns validating
 * the "exactly one active owner" invariant before calling `updateRole()`
 * twice with the same transaction client. See Section 4 of the Phase 2 doc
 * for why that split is deliberate, not an oversight.
 */
@Injectable()
export class OrganizationMembershipRepository {
  create(data: CreateMembershipInput, client: DbClient = prisma): Promise<OrganizationMembership> {
    return client.organizationMembership.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        role: data.role,
        invitedById: data.invitedById,
      },
    });
  }

  findById(id: string, client: DbClient = prisma): Promise<OrganizationMembership | null> {
    return client.organizationMembership.findUnique({ where: { id } });
  }

  /**
   * Returns the membership row regardless of status — including LEFT/
   * REMOVED — since callers need this to detect "this user has a history
   * with this org, reactivate rather than create" (see the schema
   * amendment note on MembershipStatus).
   */
  findByOrgAndUser(
    organizationId: string,
    userId: string,
    client: DbClient = prisma,
  ): Promise<OrganizationMembership | null> {
    return client.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
  }

  findActiveByOrganization(
    organizationId: string,
    client: DbClient = prisma,
  ): Promise<OrganizationMembershipWithUser[]> {
    return client.organizationMembership.findMany({
      where: { organizationId, status: "ACTIVE" },
      include: { user: { include: { profile: true } } },
      orderBy: { joinedAt: "asc" },
    });
  }

  findActiveByUser(
    userId: string,
    client: DbClient = prisma,
  ): Promise<OrganizationMembershipWithOrganization[]> {
    return client.organizationMembership.findMany({
      where: { userId, status: "ACTIVE" },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });
  }

  findActiveOwner(organizationId: string, client: DbClient = prisma): Promise<OrganizationMembership | null> {
    return client.organizationMembership.findFirst({
      where: { organizationId, role: "OWNER", status: "ACTIVE" },
    });
  }

  /**
   * General-purpose count, used by the service layer to verify invariants
   * (e.g. "is this the last active owner?") before allowing a role change
   * or removal. Not itself an invariant check — just the read primitive
   * one is built on top of.
   */
  countActiveByRole(organizationId: string, role: OrganizationRole, client: DbClient = prisma): Promise<number> {
    return client.organizationMembership.count({
      where: { organizationId, role, status: "ACTIVE" },
    });
  }

  /** Raw role change — no invariant enforcement. The service verifies preconditions before calling this. */
  updateRole(id: string, role: OrganizationRole, client: DbClient = prisma): Promise<OrganizationMembership> {
    return client.organizationMembership.update({ where: { id }, data: { role } });
  }

  /**
   * Raw status transition (ACTIVE/SUSPENDED/LEFT/REMOVED) — used for
   * suspend, reactivate, leave, and remove alike. Never deletes the row
   * (see the MembershipStatus schema amendment: "preserve membership
   * history"). Reactivating after LEFT/REMOVED updates `joinedAt` to now,
   * since the earlier `joinedAt` becomes historical the moment a new
   * membership period starts — the full timeline still lives in
   * OrganizationMembershipEventRepository, this row only reflects current
   * state plus its latest join date.
   */
  updateStatus(
    id: string,
    status: MembershipStatus,
    client: DbClient = prisma,
  ): Promise<OrganizationMembership> {
    return client.organizationMembership.update({
      where: { id },
      data: {
        status,
        ...(status === "ACTIVE" ? { joinedAt: new Date() } : {}),
      },
    });
  }
}
