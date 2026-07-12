import { Injectable } from "@nestjs/common";
import { prisma, OrganizationMembership, OrganizationMembershipWithUser, OrganizationRole, Organization, Prisma } from "@rmsm/database";
import { ConflictError, NotFoundError } from "@rmsm/shared";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { OrganizationMembershipRepository } from "../repositories/membership.repository";
import { OrganizationMembershipEventRepository } from "../repositories/membership-event.repository";

export interface TransferOwnershipResult {
  previousOwner: OrganizationMembership;
  newOwner: OrganizationMembership;
}

/**
 * Owns membership lifecycle within an already-existing organization: role
 * changes, suspension, reactivation, removal, self-service leave, and
 * ownership transfer. Organization creation's initial-Owner membership is
 * handled by OrganizationService (see that file's class comment) — not
 * duplicated here.
 *
 * "Exactly one active Owner" (Decision 1) is enforced here at the
 * application layer for every path that could violate it: changeRole
 * (blocks demoting/promoting into OWNER directly — must go through
 * transferOwnership), removeMember, and leaveOrganization all check
 * countActiveByRole/findActiveOwner before acting. transferOwnership
 * additionally re-verifies inside its transaction immediately before
 * committing, so no caller can ever observe an intermediate state with
 * zero or two active owners — the database-level partial unique index
 * (see packages/database/prisma/manual-migrations/) is the backstop for
 * this same invariant, not a replacement for these checks.
 */
@Injectable()
export class OrganizationMembershipService {
  constructor(
    private readonly membershipRepository: OrganizationMembershipRepository,
    private readonly membershipEventRepository: OrganizationMembershipEventRepository,
    private readonly auditService: AuditService,
  ) {}

  listActiveMembers(organizationId: string): Promise<OrganizationMembershipWithUser[]> {
    return this.membershipRepository.findActiveByOrganization(organizationId);
  }

  /** Phase 4 addition (additive). */
  async getMember(organizationId: string, membershipId: string): Promise<OrganizationMembershipWithUser> {
    const member = await this.membershipRepository.findByIdWithUser(membershipId);
    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundError("OrganizationMembership", membershipId);
    }
    return member;
  }

  /** Phase 4 addition (additive). Maps the caller's active memberships to their organizations, for the tenant-scoped "list my organizations" endpoint — see OrganizationController.listOrganizations()'s comment on why this is scoped, not platform-wide. */
  async listOrganizationsForUser(userId: string): Promise<Organization[]> {
    const memberships = await this.membershipRepository.findActiveByUser(userId);
    return memberships.map((m) => m.organization);
  }

  private async getMembershipInOrg(organizationId: string, membershipId: string): Promise<OrganizationMembership> {
    const membership = await this.membershipRepository.findById(membershipId);
    if (!membership || membership.organizationId !== organizationId) {
      throw new NotFoundError("OrganizationMembership", membershipId);
    }
    return membership;
  }

  /**
   * Role changes to/from OWNER are rejected here by design — ownership has
   * its own dedicated, invariant-checked workflow (transferOwnership).
   * Allowing a generic role change to silently create a second OWNER, or
   * to demote the only OWNER with no successor, is exactly the kind of
   * intermediate invalid state Decision 1 rules out.
   */
  async changeRole(
    organizationId: string,
    membershipId: string,
    newRole: OrganizationRole,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<OrganizationMembership> {
    const membership = await this.getMembershipInOrg(organizationId, membershipId);

    if (membership.role === "OWNER" || newRole === "OWNER") {
      throw new ConflictError("Ownership changes must go through transferOwnership, not changeRole.");
    }

    const previousRole = membership.role;
    const updated = await this.membershipRepository.updateRole(membershipId, newRole);

    await this.membershipEventRepository.create({
      organizationId,
      userId: membership.userId,
      action: "ROLE_CHANGED",
      previousRole,
      newRole,
      actorId,
    });
    await this.auditService.log("organization.member.role_changed", {
      userId: actorId,
      entityType: "OrganizationMembership",
      entityId: membershipId,
      metadata: { previousRole, newRole },
      ...ctx,
    });
    return updated;
  }

  /**
   * Atomically demotes the current Owner to Administrator and promotes the
   * target member to Owner. Re-verifies the current Owner immediately
   * before committing — a second check inside the transaction, not just
   * the one performed before it started — so a concurrent transfer that
   * completed in between can't be silently overwritten (Decision 1's
   * "never expose an intermediate invalid state," applied to the read as
   * well as the write).
   */
  async transferOwnership(
    organizationId: string,
    toMembershipId: string,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<TransferOwnershipResult> {
    const currentOwner = await this.membershipRepository.findActiveOwner(organizationId);
    if (!currentOwner) {
      throw new ConflictError("Organization has no active Owner to transfer from.");
    }

    const target = await this.getMembershipInOrg(organizationId, toMembershipId);
    if (target.status !== "ACTIVE") {
      throw new ConflictError("Target member must be active to receive ownership.");
    }
    if (target.id === currentOwner.id) {
      throw new ConflictError("Cannot transfer ownership to the current Owner.");
    }

    /**
     * The callback's return is explicitly typed as a fixed 2-tuple, not
     * left to infer as `OrganizationMembership[]`. Under this project's
     * `noUncheckedIndexedAccess` (tsconfig.base.json), destructuring from a
     * plain array type gives each variable `T | undefined` — only
     * destructuring from an actual tuple type gives the exact `T` for each
     * position. Without this annotation, `previousOwner`/`newOwner` below
     * would be `OrganizationMembership | undefined`, and every property
     * access on them (`.userId`, in the audit log call right after this
     * block) would fail to typecheck.
     */
    const [previousOwner, newOwner] = await prisma.$transaction(
      async (tx: Prisma.TransactionClient): Promise<[OrganizationMembership, OrganizationMembership]> => {
        const stillCurrentOwner = await this.membershipRepository.findActiveOwner(organizationId, tx);
        if (!stillCurrentOwner || stillCurrentOwner.id !== currentOwner.id) {
          throw new ConflictError("Ownership changed during this request. Refresh and try again.");
        }

        const demoted = await this.membershipRepository.updateRole(currentOwner.id, "ADMINISTRATOR", tx);
        const promoted = await this.membershipRepository.updateRole(target.id, "OWNER", tx);

        await this.membershipEventRepository.create(
          {
            organizationId,
            userId: currentOwner.userId,
            action: "OWNERSHIP_TRANSFERRED",
            previousRole: "OWNER",
            newRole: "ADMINISTRATOR",
            actorId,
          },
          tx,
        );
        await this.membershipEventRepository.create(
          {
            organizationId,
            userId: target.userId,
            action: "OWNERSHIP_TRANSFERRED",
            previousRole: target.role,
            newRole: "OWNER",
            actorId,
          },
          tx,
        );

        return [demoted, promoted];
      },
    );

    await this.auditService.log("organization.ownership_transferred", {
      userId: actorId,
      entityType: "Organization",
      entityId: organizationId,
      metadata: { fromUserId: previousOwner.userId, toUserId: newOwner.userId },
      ...ctx,
    });

    return { previousOwner, newOwner };
  }

  async suspendMember(
    organizationId: string,
    membershipId: string,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<OrganizationMembership> {
    const membership = await this.getMembershipInOrg(organizationId, membershipId);
    await this.assertNotLastActiveOwner(organizationId, membership, "suspended");

    const updated = await this.membershipRepository.updateStatus(membershipId, "SUSPENDED");
    await this.membershipEventRepository.create({
      organizationId,
      userId: membership.userId,
      action: "SUSPENDED",
      previousRole: membership.role,
      actorId,
    });
    await this.auditService.log("organization.member.suspended", {
      userId: actorId,
      entityType: "OrganizationMembership",
      entityId: membershipId,
      ...ctx,
    });
    return updated;
  }

  async reactivateMember(
    organizationId: string,
    membershipId: string,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<OrganizationMembership> {
    const membership = await this.getMembershipInOrg(organizationId, membershipId);

    const updated = await this.membershipRepository.updateStatus(membershipId, "ACTIVE");
    await this.membershipEventRepository.create({
      organizationId,
      userId: membership.userId,
      action: "REACTIVATED",
      previousRole: membership.role,
      newRole: membership.role,
      actorId,
    });
    await this.auditService.log("organization.member.reactivated", {
      userId: actorId,
      entityType: "OrganizationMembership",
      entityId: membershipId,
      ...ctx,
    });
    return updated;
  }

  async removeMember(
    organizationId: string,
    membershipId: string,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<void> {
    const membership = await this.getMembershipInOrg(organizationId, membershipId);
    await this.assertNotLastActiveOwner(organizationId, membership, "removed");

    await this.membershipRepository.updateStatus(membershipId, "REMOVED");
    await this.membershipEventRepository.create({
      organizationId,
      userId: membership.userId,
      action: "REMOVED",
      previousRole: membership.role,
      actorId,
    });
    await this.auditService.log("organization.member.removed", {
      userId: actorId,
      entityType: "OrganizationMembership",
      entityId: membershipId,
      ...ctx,
    });
  }

  async leaveOrganization(organizationId: string, userId: string, ctx: AuditContext = {}): Promise<void> {
    const membership = await this.membershipRepository.findByOrgAndUser(organizationId, userId);
    if (!membership || membership.status !== "ACTIVE") {
      throw new NotFoundError("OrganizationMembership", userId);
    }
    await this.assertNotLastActiveOwner(organizationId, membership, "left");

    await this.membershipRepository.updateStatus(membership.id, "LEFT");
    await this.membershipEventRepository.create({
      organizationId,
      userId,
      action: "LEFT",
      previousRole: membership.role,
      actorId: userId,
    });
    await this.auditService.log("organization.member.left", {
      userId,
      entityType: "OrganizationMembership",
      entityId: membership.id,
      ...ctx,
    });
  }

  /**
   * Shared guard for every path that could leave an organization
   * ownerless: suspend, remove, and self-leave. Promotion/demotion of
   * OWNER itself is blocked entirely in changeRole (see above), so this
   * only needs to catch "the sole active Owner is being taken out of
   * ACTIVE status by some other path."
   */
  private async assertNotLastActiveOwner(
    organizationId: string,
    membership: OrganizationMembership,
    actionDescription: string,
  ): Promise<void> {
    if (membership.role !== "OWNER" || membership.status !== "ACTIVE") return;

    const activeOwners = await this.membershipRepository.countActiveByRole(organizationId, "OWNER");
    if (activeOwners <= 1) {
      throw new ConflictError(
        `Cannot be ${actionDescription}: this is the final active Owner. Transfer ownership first.`,
      );
    }
  }
}