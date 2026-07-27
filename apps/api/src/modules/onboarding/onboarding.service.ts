import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import type { OrganizationRole } from "@rmsm/database";
import { ValidationError, slugify } from "@rmsm/shared";
import { AuthService, RequestContext } from "../auth/auth.service";
import { UserRepository } from "../auth/repositories/user.repository";
import { AuditService } from "../auth/services/audit.service";
import { OrganizationService } from "../organizations/services/organization.service";
import { OrganizationInvitationService } from "../organizations/services/invitation.service";
import { OrganizationMembershipService } from "../organizations/services/membership.service";
import { OrganizationRepository } from "../organizations/repositories/organization.repository";
import { OrganizationMembershipRepository } from "../organizations/repositories/membership.repository";

export interface OnboardingResult {
  message: string;
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
  /** Which branch of WM-020D's flow produced this organization/membership — lets the frontend show the right onboarding-progress copy. */
  source: "invitation_accepted" | "existing_membership" | "created";
}

/**
 * WM-020D/E — application-layer orchestrator for "what happens right
 * after a trader verifies their email." Deliberately its own module
 * rather than logic bolted onto AuthService or OrganizationService: it
 * depends on *both* of those bounded contexts, and neither of them
 * should depend on the other (Auth has no business knowing about
 * Organizations, and vice versa). Every step below delegates to an
 * existing, unmodified service method — this class contains no new
 * organization/membership/RBAC/invitation business rules of its own,
 * only the sequencing between them that WM-020D's flow diagram specifies:
 *
 *   verify email -> (existing invitation? accept it : create org+owner)
 *
 * "Do NOT invent duplicate events": OrganizationService.createOrganization()
 * already writes the OWNER OrganizationMembership row and a JOINED
 * OrganizationMembershipEvent atomically, and OrganizationInvitationService
 * .acceptInvitation() already writes an INVITATION_ACCEPTED event the same
 * way — both call AuditService themselves. Nothing here duplicates any of
 * that; this class only decides *which* of those two already-existing,
 * already-atomic operations to call.
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly authService: AuthService,
    private readonly userRepository: UserRepository,
    private readonly organizationService: OrganizationService,
    private readonly invitationService: OrganizationInvitationService,
    private readonly membershipService: OrganizationMembershipService,
    private readonly organizationRepository: OrganizationRepository,
    private readonly membershipRepository: OrganizationMembershipRepository,
    private readonly auditService: AuditService,
  ) {}

  async completeEmailVerification(
    rawToken: string,
    opts: { invitationToken?: string; companyName?: string } = {},
    ctx: RequestContext = {},
  ): Promise<OnboardingResult> {
    // WM-020F — AuthService.verifyEmail() is the sole source of truth for
    // whether the token is valid *and* now returns the verified user's id
    // directly (see its own JSDoc), so there is no separate/duplicate
    // token-resolution call here — this reuses the auth module's existing
    // verification flow exactly as-is, just consuming the extra field its
    // own lookup already had in hand.
    const { userId } = await this.authService.verifyEmail(rawToken);

    // WM-020F — everything below this point runs *after* verifyEmail()
    // has already succeeded and irreversibly consumed the single-use
    // token. Each branch's own database work is already fully
    // transactional (createOrganizationBranch's org+membership+event
    // insert, acceptInvitationBranch's invitation-accept+membership
    // upsert), so a failure here can never leave a *partially created*
    // organization/membership behind — but it *can* leave a verified
    // user with no organization at all if e.g. a transient DB error
    // strikes at exactly this moment, and — because the token is spent —
    // this same link can no longer be retried. That's a real "fails
    // unsafely" gap (Part 1): the failure would otherwise surface as an
    // undifferentiated 500 with no record of which user got stranded.
    // Catching it here doesn't fabricate a recovery this milestone
    // wasn't scoped to build (no new self-healing endpoint), but it does
    // make the stranded-user case observable (a distinct, searchable
    // audit event) and gives the frontend a message that's actually true
    // ("verified, but setup failed") instead of a generic error.
    try {
      if (opts.invitationToken) {
        return await this.acceptInvitationBranch(userId, opts.invitationToken, ctx);
      }

      const existingOrganizationId = await this.findExistingOrganization(userId);
      if (existingOrganizationId) {
        return await this.existingMembershipBranch(userId, existingOrganizationId);
      }

      return await this.createOrganizationBranch(userId, opts.companyName, ctx);
    } catch (error) {
      await this.auditService.log("onboarding.post_verification_provisioning_failed", {
        userId,
        entityType: "User",
        entityId: userId,
        metadata: {
          reason: error instanceof Error ? error.message : "unknown",
          hadInvitationToken: !!opts.invitationToken,
        },
        ...ctx,
      });
      throw new ValidationError(
        "Your email is verified, but we couldn't finish setting up your account. Please contact support — your email verification does not need to be repeated.",
      );
    }
  }

  private async acceptInvitationBranch(
    userId: string,
    invitationToken: string,
    ctx: RequestContext,
  ): Promise<OnboardingResult> {
    const membership = await this.invitationService.acceptInvitation(invitationToken, userId, ctx);
    const organization = await this.organizationService.getById(membership.organizationId);
    return {
      message: "Email verified and invitation accepted.",
      organizationId: organization.id,
      organizationName: organization.name,
      role: membership.role,
      source: "invitation_accepted",
    };
  }

  /** Re-verifying (or double-submitting) an already-onboarded account should never create a second organization. */
  private async existingMembershipBranch(userId: string, organizationId: string): Promise<OnboardingResult> {
    const [organization, membership] = await Promise.all([
      this.organizationService.getById(organizationId),
      this.membershipRepository.findByOrgAndUser(organizationId, userId),
    ]);
    return {
      message: "Email verified.",
      organizationId: organization.id,
      organizationName: organization.name,
      role: membership?.role ?? "OWNER",
      source: "existing_membership",
    };
  }

  private async createOrganizationBranch(
    userId: string,
    companyName: string | undefined,
    ctx: RequestContext,
  ): Promise<OnboardingResult> {
    const user = await this.userRepository.findById(userId);
    const firstName = user?.profile?.firstName?.trim();
    const name = companyName?.trim() || (firstName ? `${firstName}'s Organization` : "My Organization");
    const slug = await this.generateUniqueSlug(name);

    const organization = await this.organizationService.createOrganization({ name, slug }, userId, ctx);

    await this.auditService.log("onboarding.organization_auto_created", {
      userId,
      entityType: "Organization",
      entityId: organization.id,
      ...ctx,
    });

    return {
      message: "Email verified and workspace created.",
      organizationId: organization.id,
      organizationName: organization.name,
      role: "OWNER",
      source: "created",
    };
  }

  private async findExistingOrganization(userId: string): Promise<string | null> {
    const organizations = await this.membershipService.listOrganizationsForUser(userId);
    return organizations[0]?.id ?? null;
  }

  /** slugify() (see @rmsm/shared) only produces a *candidate* — collisions are expected whenever two users share a first name and never provide a company name, so this retries with a short random suffix rather than failing onboarding outright. */
  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || "organization";
    let candidate = base.length >= 3 ? base : `${base}-org`;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const existing = await this.organizationRepository.findBySlug(candidate);
      if (!existing) return candidate;
      candidate = `${base}-${randomBytes(3).toString("hex")}`;
    }

    throw new ValidationError("Could not generate a unique organization identifier. Please try again.");
  }
}
