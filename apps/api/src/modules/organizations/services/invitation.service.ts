import { Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import {
  prisma,
  OrganizationInvitation,
  OrganizationInvitationWithOrganization,
  OrganizationMembership,
  OrganizationRole,
  Prisma,
} from "@rmsm/database";
import { ConflictError, NotFoundError, ValidationError } from "@rmsm/shared";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../config/app-config.module";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { TokenService } from "../../auth/services/token.service";
import { UserRepository } from "../../auth/repositories/user.repository";
import { EmailService } from "../../email/email.service.interface";
import { OrganizationInvitationRepository } from "../repositories/invitation.repository";
import { OrganizationMembershipRepository } from "../repositories/membership.repository";
import { OrganizationMembershipEventRepository } from "../repositories/membership-event.repository";
import { OrganizationRepository } from "../repositories/organization.repository";
import { organizationInvitationEmail, invitationRevokedEmail } from "../templates/organization-invitation.template";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Owns the invitation lifecycle: create, resend, cancel, accept, reject,
 * and the scheduled expiry sweep. Reuses Module 002's TokenService for
 * hashing (same SHA-256 approach as PasswordReset/EmailVerification —
 * ADR-008) and UserRepository for looking up the accepting user, rather
 * than duplicating either.
 */
@Injectable()
export class OrganizationInvitationService {
  constructor(
    private readonly invitationRepository: OrganizationInvitationRepository,
    private readonly membershipRepository: OrganizationMembershipRepository,
    private readonly membershipEventRepository: OrganizationMembershipEventRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    @Inject(APP_CONFIG) private readonly config: Env,
  ) {}

  async createInvitation(
    organizationId: string,
    email: string,
    role: OrganizationRole,
    invitedById: string,
    ctx: AuditContext = {},
  ): Promise<{ message: string }> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) throw new NotFoundError("Organization", organizationId);

    const existingInvitation = await this.invitationRepository.findPendingByOrgAndEmail(organizationId, email);
    if (existingInvitation) {
      throw new ConflictError(`${email} already has a pending invitation to this organization.`);
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      const existingMembership = await this.membershipRepository.findByOrgAndUser(organizationId, existingUser.id);
      if (existingMembership?.status === "ACTIVE") {
        throw new ConflictError(`${email} is already a member of this organization.`);
      }
    }

    const { raw, hash } = this.generateToken();
    const invitation = await this.invitationRepository.create({
      organizationId,
      email,
      role,
      tokenHash: hash,
      invitedById,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    });

    await this.membershipEventRepository.create({
      organizationId,
      userId: existingUser?.id,
      action: "INVITED",
      newRole: role,
      actorId: invitedById,
      metadata: { email },
    });

    const link = `${this.config.WEB_APP_URL}/invitations/accept?token=${raw}`;
    const { subject, html } = organizationInvitationEmail(link, organization.name, role);
    await this.emailService.send({ to: email, subject, html });

    await this.auditService.log("organization.invitation.created", {
      userId: invitedById,
      entityType: "OrganizationInvitation",
      entityId: invitation.id,
      metadata: { email, role },
      ...ctx,
    });

    return { message: "Invitation sent." };
  }

  async resendInvitation(
    organizationId: string,
    invitationId: string,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<{ message: string }> {
    const invitation = await this.getInvitationInOrg(organizationId, invitationId);
    if (invitation.status !== "PENDING" && invitation.status !== "EXPIRED") {
      throw new ConflictError(`Cannot resend an invitation with status ${invitation.status}.`);
    }

    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) throw new NotFoundError("Organization", organizationId);

    const { raw, hash } = this.generateToken();
    await this.invitationRepository.regenerateToken(invitationId, hash, new Date(Date.now() + INVITATION_TTL_MS));

    const link = `${this.config.WEB_APP_URL}/invitations/accept?token=${raw}`;
    const { subject, html } = organizationInvitationEmail(link, organization.name, invitation.role);
    await this.emailService.send({ to: invitation.email, subject, html });

    await this.auditService.log("organization.invitation.resent", {
      userId: actorId,
      entityType: "OrganizationInvitation",
      entityId: invitationId,
      ...ctx,
    });
    return { message: "Invitation resent." };
  }

  async cancelInvitation(
    organizationId: string,
    invitationId: string,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<{ message: string }> {
    const invitation = await this.getInvitationInOrg(organizationId, invitationId);
    if (invitation.status !== "PENDING") {
      throw new ConflictError(`Cannot cancel an invitation with status ${invitation.status}.`);
    }

    const organization = await this.organizationRepository.findById(organizationId);
    await this.invitationRepository.updateStatus(invitationId, "CANCELLED");

    if (organization) {
      const { subject, html } = invitationRevokedEmail(organization.name);
      await this.emailService.send({ to: invitation.email, subject, html });
    }

    await this.auditService.log("organization.invitation.cancelled", {
      userId: actorId,
      entityType: "OrganizationInvitation",
      entityId: invitationId,
      ...ctx,
    });
    return { message: "Invitation cancelled." };
  }

  /**
   * Accepts an invitation and creates or reactivates the corresponding
   * membership as one atomic unit — an accepted invitation with no
   * resulting membership (or vice versa) is exactly the kind of
   * intermediate invalid state this module avoids by construction.
   */
  async acceptInvitation(
    rawToken: string,
    acceptingUserId: string,
    ctx: AuditContext = {},
  ): Promise<OrganizationMembership> {
    const tokenHash = this.tokenService.hashToken(rawToken);
    const invitation = await this.invitationRepository.findByTokenHash(tokenHash);

    if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
      throw new ValidationError("Invalid or expired invitation.");
    }

    const acceptingUser = await this.userRepository.findById(acceptingUserId);
    if (!acceptingUser || acceptingUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ValidationError("This invitation was sent to a different email address.");
    }

    const membership = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.invitationRepository.updateStatus(invitation.id, "ACCEPTED", { acceptedAt: new Date() }, tx);

      const existing = await this.membershipRepository.findByOrgAndUser(
        invitation.organizationId,
        acceptingUserId,
        tx,
      );

      let result: OrganizationMembership;
      if (existing) {
        await this.membershipRepository.updateRole(existing.id, invitation.role, tx);
        result = await this.membershipRepository.updateStatus(existing.id, "ACTIVE", tx);
      } else {
        result = await this.membershipRepository.create(
          {
            organizationId: invitation.organizationId,
            userId: acceptingUserId,
            role: invitation.role,
            invitedById: invitation.invitedById,
          },
          tx,
        );
      }

      await this.membershipEventRepository.create(
        {
          organizationId: invitation.organizationId,
          userId: acceptingUserId,
          action: "INVITATION_ACCEPTED",
          newRole: invitation.role,
          actorId: acceptingUserId,
        },
        tx,
      );

      return result;
    });

    await this.auditService.log("organization.invitation.accepted", {
      userId: acceptingUserId,
      entityType: "OrganizationInvitation",
      entityId: invitation.id,
      metadata: { organizationId: invitation.organizationId },
      ...ctx,
    });

    return membership;
  }

  async rejectInvitation(rawToken: string, ctx: AuditContext = {}): Promise<{ message: string }> {
    const tokenHash = this.tokenService.hashToken(rawToken);
    const invitation = await this.invitationRepository.findByTokenHash(tokenHash);
    if (!invitation || invitation.status !== "PENDING") {
      throw new ValidationError("Invalid or expired invitation.");
    }

    await this.invitationRepository.updateStatus(invitation.id, "REJECTED");
    await this.auditService.log("organization.invitation.rejected", {
      entityType: "OrganizationInvitation",
      entityId: invitation.id,
      ...ctx,
    });
    return { message: "Invitation declined." };
  }

  listPendingForOrganization(organizationId: string): Promise<OrganizationInvitation[]> {
    return this.invitationRepository.findPendingByOrganization(organizationId);
  }

  listPendingForEmail(email: string): Promise<OrganizationInvitationWithOrganization[]> {
    return this.invitationRepository.findPendingByEmail(email);
  }

  /** Scheduled sweep — not wired to a cron trigger in this phase (Phase 3 is services only); a scheduler module calling this is a Phase 5+ concern. */
  expireOverdueInvitations(): Promise<Prisma.BatchPayload> {
    return this.invitationRepository.expireOverdue();
  }

  private async getInvitationInOrg(organizationId: string, invitationId: string): Promise<OrganizationInvitation> {
    const invitation = await this.invitationRepository.findById(invitationId);
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new NotFoundError("OrganizationInvitation", invitationId);
    }
    return invitation;
  }

  private generateToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString("base64url");
    return { raw, hash: this.tokenService.hashToken(raw) };
  }
}
