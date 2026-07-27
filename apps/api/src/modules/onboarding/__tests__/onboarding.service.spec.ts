// OnboardingService itself never touches `prisma` — but it imports the real
// AuthService/OrganizationService/etc. classes (needed for NestJS's
// constructor-injection metadata, not just as types), and those modules
// initialize the real `prisma` singleton at import time. Same workaround
// as every other unit spec in this repo that hits this (see
// auth.service.register.spec.ts's own comment) — no live DB dependency.
jest.mock("@rmsm/database", () => ({ prisma: {} }));

import type { Organization, OrganizationMembership, OrganizationRole } from "@rmsm/database";
import { ValidationError } from "@rmsm/shared";
import { OnboardingService } from "../onboarding.service";
import type { AuthService } from "../../auth/auth.service";
import type { UserRepository } from "../../auth/repositories/user.repository";
import type { AuditService } from "../../auth/services/audit.service";
import type { OrganizationService } from "../../organizations/services/organization.service";
import type { OrganizationInvitationService } from "../../organizations/services/invitation.service";
import type { OrganizationMembershipService } from "../../organizations/services/membership.service";
import type { OrganizationRepository } from "../../organizations/repositories/organization.repository";
import type { OrganizationMembershipRepository } from "../../organizations/repositories/membership.repository";

describe("OnboardingService (WM-020D/E)", () => {
  type AuthServiceMock = jest.Mocked<Pick<AuthService, "verifyEmail">>;
  type UserRepoMock = jest.Mocked<Pick<UserRepository, "findById">>;
  type AuditServiceMock = jest.Mocked<Pick<AuditService, "log">>;
  type OrgServiceMock = jest.Mocked<Pick<OrganizationService, "createOrganization" | "getById">>;
  type InvitationServiceMock = jest.Mocked<Pick<OrganizationInvitationService, "acceptInvitation">>;
  type MembershipServiceMock = jest.Mocked<Pick<OrganizationMembershipService, "listOrganizationsForUser">>;
  type OrgRepoMock = jest.Mocked<Pick<OrganizationRepository, "findBySlug">>;
  type MembershipRepoMock = jest.Mocked<Pick<OrganizationMembershipRepository, "findByOrgAndUser">>;

  function buildOrganization(overrides: Partial<Organization> = {}): Organization {
    const now = new Date();
    return {
      id: "org-1",
      name: "Jane's Organization",
      slug: "janes-organization",
      logoUrl: null,
      description: null,
      timezone: "UTC",
      currency: "USD",
      country: null,
      website: null,
      settings: {},
      status: "ACTIVE",
      billingCustomerId: null,
      seatsLimit: null,
      createdById: "user-1",
      updatedById: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...overrides,
    } as Organization;
  }

  function buildMembership(overrides: Partial<OrganizationMembership> = {}): OrganizationMembership {
    const now = new Date();
    return {
      id: "membership-1",
      organizationId: "org-1",
      userId: "user-1",
      role: "OWNER" as OrganizationRole,
      status: "ACTIVE",
      invitedById: null,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as OrganizationMembership;
  }

  function buildHarness() {
    const authService: AuthServiceMock = {
      verifyEmail: jest.fn().mockResolvedValue({ message: "Email verified successfully.", userId: "user-1" }),
    };
    const userRepository: UserRepoMock = {
      findById: jest.fn().mockResolvedValue({ id: "user-1", email: "jane@acme.example", profile: { firstName: "Jane", lastName: "Trader" } }),
    };
    const auditService: AuditServiceMock = { log: jest.fn().mockResolvedValue(undefined) };
    const organizationService: OrgServiceMock = {
      createOrganization: jest.fn().mockResolvedValue(buildOrganization()),
      getById: jest.fn().mockResolvedValue(buildOrganization()),
    };
    const invitationService: InvitationServiceMock = {
      acceptInvitation: jest.fn().mockResolvedValue(buildMembership({ role: "ANALYST" as OrganizationRole, organizationId: "org-invited" })),
    };
    const membershipService: MembershipServiceMock = {
      listOrganizationsForUser: jest.fn().mockResolvedValue([]),
    };
    const organizationRepository: OrgRepoMock = {
      findBySlug: jest.fn().mockResolvedValue(null),
    };
    const membershipRepository: MembershipRepoMock = {
      findByOrgAndUser: jest.fn().mockResolvedValue(buildMembership()),
    };

    const service = new OnboardingService(
      authService as unknown as AuthService,
      userRepository as unknown as UserRepository,
      organizationService as unknown as OrganizationService,
      invitationService as unknown as OrganizationInvitationService,
      membershipService as unknown as OrganizationMembershipService,
      organizationRepository as unknown as OrganizationRepository,
      membershipRepository as unknown as OrganizationMembershipRepository,
      auditService as unknown as AuditService,
    );

    return {
      service,
      authService,
      userRepository,
      auditService,
      organizationService,
      invitationService,
      membershipService,
      organizationRepository,
      membershipRepository,
    };
  }

  describe("first-organization (onboarding) flow", () => {
    it("verifies the email, then creates an organization named after the trader's first name and assigns Owner", async () => {
      const h = buildHarness();

      const result = await h.service.completeEmailVerification("raw-verify-token", {}, { ipAddress: "127.0.0.1" });

      expect(h.authService.verifyEmail).toHaveBeenCalledWith("raw-verify-token");
      expect(h.organizationService.createOrganization).toHaveBeenCalledWith(
        { name: "Jane's Organization", slug: "jane-s-organization" },
        "user-1",
        { ipAddress: "127.0.0.1" },
      );
      expect(h.invitationService.acceptInvitation).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: expect.stringContaining("workspace created"),
        organizationId: "org-1",
        organizationName: "Jane's Organization",
        role: "OWNER",
        source: "created",
      });
    });

    it("uses the provided company name over the first-name fallback", async () => {
      const h = buildHarness();
      h.organizationService.createOrganization.mockResolvedValue(
        buildOrganization({ name: "Acme Capital", slug: "acme-capital" }),
      );

      await h.service.completeEmailVerification("raw-verify-token", { companyName: "Acme Capital" });

      expect(h.organizationService.createOrganization).toHaveBeenCalledWith(
        { name: "Acme Capital", slug: "acme-capital" },
        "user-1",
        {},
      );
    });

    it("retries with a suffixed slug when the first candidate is already taken (duplicate organization prevention)", async () => {
      const h = buildHarness();
      h.organizationRepository.findBySlug.mockResolvedValueOnce(buildOrganization()); // first candidate taken
      h.organizationRepository.findBySlug.mockResolvedValueOnce(null); // suffixed candidate free

      await h.service.completeEmailVerification("raw-verify-token", {});

      expect(h.organizationRepository.findBySlug).toHaveBeenCalledTimes(2);
      // Avoids indexing into `.mock.calls[0]` directly (typed as possibly
      // `undefined` under noUncheckedIndexedAccess) — toHaveBeenCalledWith
      // asserts the same thing without needing to narrow that type.
      expect(h.organizationService.createOrganization).toHaveBeenCalledWith(
        expect.objectContaining({ slug: expect.stringMatching(/^jane-s-organization-[0-9a-f]{6}$/) }),
        "user-1",
        {},
      );
    });

    it("throws instead of looping forever if no unique slug can be found", async () => {
      const h = buildHarness();
      h.organizationRepository.findBySlug.mockResolvedValue(buildOrganization()); // always taken

      await expect(h.service.completeEmailVerification("raw-verify-token", {})).rejects.toBeInstanceOf(ValidationError);
      expect(h.organizationService.createOrganization).not.toHaveBeenCalled();
    });
  });

  describe("existing invitation flow", () => {
    it("accepts the invitation instead of creating a new organization", async () => {
      const h = buildHarness();

      const result = await h.service.completeEmailVerification("raw-verify-token", { invitationToken: "raw-invite-token" }, { ipAddress: "1.2.3.4" });

      expect(h.invitationService.acceptInvitation).toHaveBeenCalledWith("raw-invite-token", "user-1", { ipAddress: "1.2.3.4" });
      expect(h.organizationService.createOrganization).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: expect.stringContaining("invitation accepted"),
        organizationId: "org-1",
        organizationName: "Jane's Organization",
        role: "ANALYST",
        source: "invitation_accepted",
      });
    });
  });

  describe("existing organization flow (duplicate organization prevention)", () => {
    it("does not create a second organization for a user who already belongs to one", async () => {
      const h = buildHarness();
      h.membershipService.listOrganizationsForUser.mockResolvedValue([buildOrganization({ id: "org-existing", name: "Existing Org" })]);
      h.organizationService.getById.mockResolvedValue(buildOrganization({ id: "org-existing", name: "Existing Org" }));
      h.membershipRepository.findByOrgAndUser.mockResolvedValue(buildMembership({ organizationId: "org-existing", role: "OWNER" as OrganizationRole }));

      const result = await h.service.completeEmailVerification("raw-verify-token", {});

      expect(h.organizationService.createOrganization).not.toHaveBeenCalled();
      expect(h.invitationService.acceptInvitation).not.toHaveBeenCalled();
      expect(result).toMatchObject({ organizationId: "org-existing", source: "existing_membership" });
    });
  });

  describe("token validation", () => {
    it("propagates verifyEmail()'s own error for an invalid/expired token without touching organizations", async () => {
      const h = buildHarness();
      h.authService.verifyEmail.mockRejectedValue(new ValidationError("Invalid or expired verification token."));

      await expect(h.service.completeEmailVerification("bad-token", {})).rejects.toBeInstanceOf(ValidationError);
      expect(h.organizationService.createOrganization).not.toHaveBeenCalled();
      expect(h.invitationService.acceptInvitation).not.toHaveBeenCalled();
    });
  });

  describe("post-verification provisioning failure (WM-020F — fail safely)", () => {
    it("logs a distinct, searchable audit event and throws an honest 'verified but not set up' error when org creation fails after the token is already consumed", async () => {
      const h = buildHarness();
      h.organizationService.createOrganization.mockRejectedValue(new Error("db connection lost"));

      await expect(h.service.completeEmailVerification("raw-verify-token", { companyName: "Acme" })).rejects.toThrow(
        /verified, but we couldn't finish setting up/i,
      );

      // verifyEmail() itself must still have succeeded and not been retried —
      // the token really is spent; this isn't a "just try again" failure.
      expect(h.authService.verifyEmail).toHaveBeenCalledTimes(1);

      expect(h.auditService.log).toHaveBeenCalledWith(
        "onboarding.post_verification_provisioning_failed",
        expect.objectContaining({
          userId: "user-1",
          metadata: expect.objectContaining({ reason: "db connection lost", hadInvitationToken: false }),
        }),
      );
    });

    it("logs hadInvitationToken:true when the failure happens on the invitation-accept branch", async () => {
      const h = buildHarness();
      h.invitationService.acceptInvitation.mockRejectedValue(new ValidationError("Invalid or expired invitation."));

      await expect(
        h.service.completeEmailVerification("raw-verify-token", { invitationToken: "raw-invite-token" }),
      ).rejects.toThrow(/verified, but we couldn't finish setting up/i);

      expect(h.auditService.log).toHaveBeenCalledWith(
        "onboarding.post_verification_provisioning_failed",
        expect.objectContaining({ metadata: expect.objectContaining({ hadInvitationToken: true }) }),
      );
    });
  });
});
