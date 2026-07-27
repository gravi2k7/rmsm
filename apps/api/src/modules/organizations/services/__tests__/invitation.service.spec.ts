import { ConflictError, NotFoundError, ValidationError } from "@rmsm/shared";
import type {
  OrganizationInvitation,
  OrganizationMembership,
} from "@rmsm/database";

// Only `acceptInvitation()` touches `prisma` directly (for `$transaction`);
// every other method goes through the constructor-injected repositories
// below, mocked the same `jest.Mocked<Pick<T, ...>>` way as
// membership.service.spec.ts. `$transaction` here just invokes the
// callback with a stub client — the repository methods it calls are
// already mocked and don't care what "client" they're given.
jest.mock("@rmsm/database", () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

import { OrganizationInvitationService } from "../invitation.service";
import type { OrganizationInvitationRepository } from "../../repositories/invitation.repository";
import type { OrganizationMembershipRepository } from "../../repositories/membership.repository";
import type { OrganizationMembershipEventRepository } from "../../repositories/membership-event.repository";
import type { OrganizationRepository } from "../../repositories/organization.repository";
import type { UserRepository } from "../../../auth/repositories/user.repository";
import type { TokenService } from "../../../auth/services/token.service";
import type { EmailService } from "../../../email/email.service.interface";
import type { AuditService } from "../../../auth/services/audit.service";

describe("OrganizationInvitationService (WM-020E)", () => {
  type InvitationRepoMock = jest.Mocked<
    Pick<
      OrganizationInvitationRepository,
      | "create"
      | "findById"
      | "findByTokenHash"
      | "findPendingByOrgAndEmail"
      | "findPendingByOrganization"
      | "updateStatus"
      | "regenerateToken"
    >
  >;
  type MembershipRepoMock = jest.Mocked<Pick<OrganizationMembershipRepository, "findByOrgAndUser" | "create" | "updateRole" | "updateStatus">>;
  type MembershipEventRepoMock = jest.Mocked<Pick<OrganizationMembershipEventRepository, "create">>;
  type OrganizationRepoMock = jest.Mocked<Pick<OrganizationRepository, "findById">>;
  type UserRepoMock = jest.Mocked<Pick<UserRepository, "findByEmail" | "findById">>;
  type TokenServiceMock = jest.Mocked<Pick<TokenService, "hashToken">>;
  type EmailServiceMock = jest.Mocked<Pick<EmailService, "send">>;
  type AuditServiceMock = jest.Mocked<Pick<AuditService, "log">>;

  const now = new Date();
  const organization = { id: "org-1", name: "Acme Trading Desk" };

  function buildInvitation(overrides: Partial<OrganizationInvitation> = {}): OrganizationInvitation {
    return {
      id: "inv-1",
      organizationId: "org-1",
      email: "invitee@example.com",
      role: "TRADER",
      tokenHash: "hash-1",
      status: "PENDING",
      invitedById: "inviter-1",
      expiresAt: new Date(now.getTime() + 60_000),
      acceptedAt: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as OrganizationInvitation;
  }

  function buildService() {
    const invitationRepository: InvitationRepoMock = {
      create: jest.fn(),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findPendingByOrgAndEmail: jest.fn().mockResolvedValue(null),
      findPendingByOrganization: jest.fn(),
      updateStatus: jest.fn(),
      regenerateToken: jest.fn(),
    };
    const membershipRepository: MembershipRepoMock = {
      findByOrgAndUser: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      updateRole: jest.fn(),
      updateStatus: jest.fn(),
    };
    const membershipEventRepository: MembershipEventRepoMock = { create: jest.fn().mockResolvedValue({}) };
    const organizationRepository: OrganizationRepoMock = { findById: jest.fn().mockResolvedValue(organization) };
    const userRepository: UserRepoMock = { findByEmail: jest.fn().mockResolvedValue(null), findById: jest.fn() };
    const tokenService: TokenServiceMock = { hashToken: jest.fn((raw: string) => `hashed:${raw}`) };
    const emailService: EmailServiceMock = { send: jest.fn().mockResolvedValue(undefined) };
    const auditService: AuditServiceMock = { log: jest.fn().mockResolvedValue(undefined) };
    const config = { WEB_APP_URL: "http://localhost:3000" };

    const service = new OrganizationInvitationService(
      invitationRepository as unknown as OrganizationInvitationRepository,
      membershipRepository as unknown as OrganizationMembershipRepository,
      membershipEventRepository as unknown as OrganizationMembershipEventRepository,
      organizationRepository as unknown as OrganizationRepository,
      userRepository as unknown as UserRepository,
      tokenService as unknown as TokenService,
      emailService as unknown as EmailService,
      auditService as unknown as AuditService,
      config as never,
    );

    return {
      service,
      invitationRepository,
      membershipRepository,
      membershipEventRepository,
      organizationRepository,
      userRepository,
      tokenService,
      emailService,
      auditService,
    };
  }

  describe("createInvitation — invite new user", () => {
    it("creates a PENDING invitation, sends the email, and logs an audit entry", async () => {
      const { service, invitationRepository, emailService, auditService } = buildService();
      invitationRepository.create.mockResolvedValue(buildInvitation());

      const result = await service.createInvitation("org-1", "invitee@example.com", "TRADER", "inviter-1");

      expect(result).toEqual({ message: "Invitation sent." });
      expect(invitationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-1", email: "invitee@example.com", role: "TRADER" }),
      );
      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: "invitee@example.com" }),
      );
      expect(auditService.log).toHaveBeenCalledWith("organization.invitation.created", expect.any(Object));
    });

    it("passes a custom message and expiresInDays through to the email and the stored expiry", async () => {
      const { service, invitationRepository, emailService } = buildService();
      invitationRepository.create.mockResolvedValue(buildInvitation());

      await service.createInvitation("org-1", "invitee@example.com", "ANALYST", "inviter-1", {}, {
        message: "Welcome aboard!",
        expiresInDays: 14,
      });

      const createArgs = invitationRepository.create.mock.calls[0]?.[0];
      const expectedMs = 14 * 24 * 60 * 60 * 1000;
      const expiresAtMs = createArgs?.expiresAt.getTime() ?? 0;
      expect(expiresAtMs - Date.now()).toBeGreaterThan(expectedMs - 5000);
      expect(expiresAtMs - Date.now()).toBeLessThanOrEqual(expectedMs);

      const emailHtml = emailService.send.mock.calls[0]?.[0]?.html as string;
      expect(emailHtml).toContain("Welcome aboard!");
      expect(emailHtml).toContain("14 days");
    });

    it("throws ConflictError — duplicate invitation to the same org+email while one is already pending", async () => {
      const { service, invitationRepository } = buildService();
      invitationRepository.findPendingByOrgAndEmail.mockResolvedValue(buildInvitation());

      await expect(service.createInvitation("org-1", "invitee@example.com", "TRADER", "inviter-1")).rejects.toThrow(
        ConflictError,
      );
      expect(invitationRepository.create).not.toHaveBeenCalled();
    });

    it("throws ConflictError — the invitee is already an active member", async () => {
      const { service, userRepository, membershipRepository } = buildService();
      userRepository.findByEmail.mockResolvedValue({ id: "existing-user" } as never);
      membershipRepository.findByOrgAndUser.mockResolvedValue({ status: "ACTIVE" } as never);

      await expect(service.createInvitation("org-1", "invitee@example.com", "TRADER", "inviter-1")).rejects.toThrow(
        ConflictError,
      );
    });

    it("throws NotFoundError when the organization does not exist", async () => {
      const { service, organizationRepository } = buildService();
      organizationRepository.findById.mockResolvedValue(null);

      await expect(service.createInvitation("missing-org", "invitee@example.com", "TRADER", "inviter-1")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("acceptInvitation — role and workspace (organization) assignment", () => {
    it("accepts a valid invitation for an existing account and creates a new membership with the invited role", async () => {
      const { service, invitationRepository, membershipRepository, membershipEventRepository, userRepository, auditService } =
        buildService();
      const invitation = buildInvitation();
      invitationRepository.findByTokenHash.mockResolvedValue(invitation);
      userRepository.findById.mockResolvedValue({ id: "user-2", email: "invitee@example.com" } as never);
      membershipRepository.findByOrgAndUser.mockResolvedValue(null);
      const created = { id: "mem-1", organizationId: "org-1", userId: "user-2", role: "TRADER" } as OrganizationMembership;
      membershipRepository.create.mockResolvedValue(created);

      const result = await service.acceptInvitation("raw-token", "user-2");

      expect(result).toEqual(created);
      expect(invitationRepository.updateStatus).toHaveBeenCalledWith(
        "inv-1",
        "ACCEPTED",
        expect.objectContaining({ acceptedAt: expect.any(Date) }),
        expect.anything(),
      );
      expect(membershipRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-1", userId: "user-2", role: "TRADER" }),
        expect.anything(),
      );
      expect(membershipEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: "INVITATION_ACCEPTED", newRole: "TRADER" }),
        expect.anything(),
      );
      expect(auditService.log).toHaveBeenCalledWith("organization.invitation.accepted", expect.any(Object));
    });

    it("re-activates and re-roles an existing (e.g. previously removed) membership instead of creating a duplicate one", async () => {
      const { service, invitationRepository, membershipRepository, userRepository } = buildService();
      invitationRepository.findByTokenHash.mockResolvedValue(buildInvitation());
      userRepository.findById.mockResolvedValue({ id: "user-2", email: "invitee@example.com" } as never);
      const existing = { id: "mem-1", organizationId: "org-1", userId: "user-2", role: "VIEWER" } as OrganizationMembership;
      membershipRepository.findByOrgAndUser.mockResolvedValue(existing);
      membershipRepository.updateStatus.mockResolvedValue({ ...existing, role: "TRADER", status: "ACTIVE" } as never);

      const result = await service.acceptInvitation("raw-token", "user-2");

      expect(membershipRepository.updateRole).toHaveBeenCalledWith("mem-1", "TRADER", expect.anything());
      expect(membershipRepository.updateStatus).toHaveBeenCalledWith("mem-1", "ACTIVE", expect.anything());
      expect(membershipRepository.create).not.toHaveBeenCalled();
      expect(result.role).toBe("TRADER");
    });

    it("rejects an expired invitation", async () => {
      const { service, invitationRepository } = buildService();
      invitationRepository.findByTokenHash.mockResolvedValue(
        buildInvitation({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.acceptInvitation("raw-token", "user-2")).rejects.toThrow(ValidationError);
    });

    it("rejects an already-accepted/declined/cancelled invitation (non-PENDING status)", async () => {
      const { service, invitationRepository } = buildService();
      invitationRepository.findByTokenHash.mockResolvedValue(buildInvitation({ status: "REJECTED" }));

      await expect(service.acceptInvitation("raw-token", "user-2")).rejects.toThrow(ValidationError);
    });

    it("rejects an unknown token", async () => {
      const { service, invitationRepository } = buildService();
      invitationRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.acceptInvitation("raw-token", "user-2")).rejects.toThrow(ValidationError);
    });

    it("rejects when the accepting account's email doesn't match the invited email", async () => {
      const { service, invitationRepository, userRepository } = buildService();
      invitationRepository.findByTokenHash.mockResolvedValue(buildInvitation({ email: "invitee@example.com" }));
      userRepository.findById.mockResolvedValue({ id: "user-2", email: "someone-else@example.com" } as never);

      await expect(service.acceptInvitation("raw-token", "user-2")).rejects.toThrow(ValidationError);
    });
  });

  describe("rejectInvitation — decline", () => {
    it("marks a pending invitation REJECTED and creates no membership", async () => {
      const { service, invitationRepository, membershipRepository } = buildService();
      invitationRepository.findByTokenHash.mockResolvedValue(buildInvitation());

      const result = await service.rejectInvitation("raw-token");

      expect(result).toEqual({ message: "Invitation declined." });
      expect(invitationRepository.updateStatus).toHaveBeenCalledWith("inv-1", "REJECTED");
      expect(membershipRepository.create).not.toHaveBeenCalled();
    });

    it("rejects (rejects the reject, so to speak) an already non-PENDING invitation", async () => {
      const { service, invitationRepository } = buildService();
      invitationRepository.findByTokenHash.mockResolvedValue(buildInvitation({ status: "EXPIRED" }));

      await expect(service.rejectInvitation("raw-token")).rejects.toThrow(ValidationError);
    });
  });

  describe("expireInvitation — admin-forced expiry with resend support", () => {
    it("sets a pending invitation to EXPIRED", async () => {
      const { service, invitationRepository } = buildService();
      invitationRepository.findById.mockResolvedValue(buildInvitation());
      invitationRepository.updateStatus.mockResolvedValue(buildInvitation({ status: "EXPIRED" }));

      const result = await service.expireInvitation("org-1", "inv-1", "actor-1");

      expect(result.status).toBe("EXPIRED");
      expect(invitationRepository.updateStatus).toHaveBeenCalledWith("inv-1", "EXPIRED");
    });

    it("resend reissues a token and a fresh expiry for an EXPIRED invitation", async () => {
      const { service, invitationRepository, emailService } = buildService();
      invitationRepository.findById.mockResolvedValue(buildInvitation({ status: "EXPIRED" }));

      const result = await service.resendInvitation("org-1", "inv-1", "actor-1");

      expect(result).toEqual({ message: "Invitation resent." });
      expect(invitationRepository.regenerateToken).toHaveBeenCalled();
      expect(emailService.send).toHaveBeenCalled();
    });

    it("resend refuses an invitation that isn't PENDING or EXPIRED (e.g. already ACCEPTED)", async () => {
      const { service, invitationRepository } = buildService();
      invitationRepository.findById.mockResolvedValue(buildInvitation({ status: "ACCEPTED" }));

      await expect(service.resendInvitation("org-1", "inv-1", "actor-1")).rejects.toThrow(ConflictError);
    });
  });

  describe("validateToken — public, read-only, no-enumeration preview", () => {
    it("returns valid:true with org/role/email for a live token, without mutating anything", async () => {
      const { service, invitationRepository, organizationRepository } = buildService();
      invitationRepository.findByTokenHash.mockResolvedValue(buildInvitation());

      const result = await service.validateToken("raw-token");

      expect(result).toEqual({ valid: true, organizationName: organization.name, role: "TRADER", email: "invitee@example.com" });
      expect(organizationRepository.findById).toHaveBeenCalledWith("org-1");
      expect(invitationRepository.updateStatus).not.toHaveBeenCalled();
    });

    it("returns valid:false (not an error, not an enumeration signal) for an unknown or expired token", async () => {
      const { service, invitationRepository } = buildService();
      invitationRepository.findByTokenHash.mockResolvedValue(null);

      const result = await service.validateToken("raw-token");

      expect(result).toEqual({ valid: false });
    });
  });
});
