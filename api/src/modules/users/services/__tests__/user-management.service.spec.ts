import { ConflictError, NotFoundError } from "@rmsm/shared";
import type { User, UserWithProfile, Profile, Organization } from "@rmsm/database";
import { UserManagementService } from "../user-management.service";
import type { UserRepository } from "../../../auth/repositories/user.repository";
import type { ProfileRepository } from "../../repositories/profile.repository";
import type { AuditService } from "../../../auth/services/audit.service";
import type { AuthService } from "../../../auth/auth.service";
import type { DomainEventPublisher } from "../../../../common/events/domain-event-publisher.service";
import type { OrganizationMembershipService } from "../../../organizations/services/membership.service";
import type { OrganizationInvitationService } from "../../../organizations/services/invitation.service";

/**
 * Module 004 Domain 1 unit coverage for UserManagementService — hand-rolled
 * repository/service mocks, same style as Module 003's
 * organization.service.spec.ts. No database required.
 */
describe("UserManagementService", () => {
  type UserRepoMock = jest.Mocked<
    Pick<
      UserRepository,
      | "findMany"
      | "findById"
      | "findByEmail"
      | "create"
      | "changeEmail"
      | "softDelete"
      | "restore"
      | "suspend"
      | "activate"
      | "bulkUpdateStatus"
      | "setMustChangePassword"
    >
  >;
  type ProfileRepoMock = jest.Mocked<Pick<ProfileRepository, "findByUserId" | "update" | "setDefaultOrganization">>;
  type AuditServiceMock = jest.Mocked<Pick<AuditService, "log">>;
  type AuthServiceMock = jest.Mocked<Pick<AuthService, "forgotPassword" | "resendVerification">>;
  type EventPublisherMock = jest.Mocked<Pick<DomainEventPublisher, "publish">>;
  type MembershipServiceMock = jest.Mocked<Pick<OrganizationMembershipService, "listOrganizationsForUser">>;
  type InvitationServiceMock = jest.Mocked<Pick<OrganizationInvitationService, "createInvitation">>;

  function buildUser(overrides: Partial<UserWithProfile> = {}): UserWithProfile {
    const now = new Date();
    return {
      id: "user-1",
      email: "person@example.com",
      passwordHash: "hash",
      firstName: "Ada",
      lastName: "Lovelace",
      status: "ACTIVE",
      emailVerifiedAt: now,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      profile: null,
      ...overrides,
    } as unknown as UserWithProfile;
  }

  function buildService() {
    const userRepository: UserRepoMock = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      changeEmail: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      suspend: jest.fn(),
      activate: jest.fn(),
      bulkUpdateStatus: jest.fn(),
      setMustChangePassword: jest.fn(),
    };
    const profileRepository: ProfileRepoMock = {
      findByUserId: jest.fn(),
      update: jest.fn(),
      setDefaultOrganization: jest.fn(),
    };
    const auditService: AuditServiceMock = { log: jest.fn().mockResolvedValue(undefined) };
    const authService: AuthServiceMock = {
      forgotPassword: jest.fn().mockResolvedValue({ message: "ok" }),
      resendVerification: jest.fn().mockResolvedValue({ message: "ok" }),
    };
    const eventPublisher: EventPublisherMock = { publish: jest.fn() };
    const membershipService: MembershipServiceMock = { listOrganizationsForUser: jest.fn() };
    const invitationService: InvitationServiceMock = { createInvitation: jest.fn() };

    const service = new UserManagementService(
      userRepository as unknown as UserRepository,
      profileRepository as unknown as ProfileRepository,
      auditService as unknown as AuditService,
      authService as unknown as AuthService,
      eventPublisher as unknown as DomainEventPublisher,
      membershipService as unknown as OrganizationMembershipService,
      invitationService as unknown as OrganizationInvitationService,
    );

    return { service, userRepository, profileRepository, auditService, authService, eventPublisher, membershipService, invitationService };
  }

  describe("createUser", () => {
    it("creates a user with no password hash and triggers the existing forgotPassword email flow", async () => {
      const { service, userRepository, authService, auditService, eventPublisher } = buildService();
      userRepository.findByEmail.mockResolvedValue(null);
      const created = buildUser({ passwordHash: null });
      userRepository.create.mockResolvedValue(created);

      const result = await service.createUser({ email: "new@example.com" }, "admin-1");

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "new@example.com", passwordHash: null }),
      );
      expect(authService.forgotPassword).toHaveBeenCalledWith("new@example.com");
      expect(auditService.log).toHaveBeenCalledWith("user.created", expect.objectContaining({ userId: "admin-1" }));
      expect(eventPublisher.publish).toHaveBeenCalledWith("UserCreated", expect.objectContaining({ userId: created.id }));
      expect(result).toBe(created);
    });

    it("throws ConflictError when a user with that email already exists", async () => {
      const { service, userRepository } = buildService();
      userRepository.findByEmail.mockResolvedValue(buildUser());

      await expect(service.createUser({ email: "person@example.com" }, "admin-1")).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("getById", () => {
    it("throws NotFoundError when the user does not exist", async () => {
      const { service, userRepository } = buildService();
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getById("missing")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("suspend / activate", () => {
    it("suspends an existing user, logs an audit entry, and publishes UserSuspended", async () => {
      const { service, userRepository, auditService, eventPublisher } = buildService();
      const existing = buildUser();
      userRepository.findById.mockResolvedValue(existing);
      userRepository.suspend.mockResolvedValue(existing as unknown as User);

      await service.suspend("user-1", "admin-1");

      expect(userRepository.suspend).toHaveBeenCalledWith("user-1");
      expect(auditService.log).toHaveBeenCalledWith("user.suspended", expect.objectContaining({ entityId: "user-1" }));
      expect(eventPublisher.publish).toHaveBeenCalledWith("UserSuspended", expect.objectContaining({ userId: "user-1" }));
    });

    it("activates an existing user and publishes UserActivated", async () => {
      const { service, userRepository, eventPublisher } = buildService();
      const existing = buildUser();
      userRepository.findById.mockResolvedValue(existing);
      userRepository.activate.mockResolvedValue(existing as unknown as User);

      await service.activate("user-1", "admin-1");

      expect(eventPublisher.publish).toHaveBeenCalledWith("UserActivated", expect.objectContaining({ userId: "user-1" }));
    });
  });

  describe("bulkUpdateStatus", () => {
    it("issues one audit entry and one event for the whole batch, not one per user", async () => {
      const { service, userRepository, auditService, eventPublisher } = buildService();
      userRepository.bulkUpdateStatus.mockResolvedValue({ count: 3 });

      const result = await service.bulkUpdateStatus(["u1", "u2", "u3"], "SUSPENDED", "admin-1");

      expect(result).toEqual({ count: 3 });
      expect(auditService.log).toHaveBeenCalledTimes(1);
      expect(eventPublisher.publish).toHaveBeenCalledTimes(1);
      expect(eventPublisher.publish).toHaveBeenCalledWith("UserSuspended", expect.objectContaining({ bulk: true }));
    });
  });

  describe("adminResetPassword / resendVerification", () => {
    it("delegates to the existing, unmodified AuthService.forgotPassword()", async () => {
      const { service, userRepository, authService } = buildService();
      userRepository.findById.mockResolvedValue(buildUser());

      await service.adminResetPassword("user-1");

      expect(authService.forgotPassword).toHaveBeenCalledWith("person@example.com");
    });

    it("delegates to the existing, unmodified AuthService.resendVerification()", async () => {
      const { service, userRepository, authService } = buildService();
      userRepository.findById.mockResolvedValue(buildUser());

      await service.resendVerification("user-1");

      expect(authService.resendVerification).toHaveBeenCalledWith("person@example.com");
    });
  });

  describe("listMemberships / inviteToOrganization", () => {
    it("delegates listMemberships to OrganizationMembershipService.listOrganizationsForUser", async () => {
      const { service, membershipService } = buildService();
      const orgs = [{ id: "org-1" } as Organization];
      membershipService.listOrganizationsForUser.mockResolvedValue(orgs);

      const result = await service.listMemberships("user-1");

      expect(membershipService.listOrganizationsForUser).toHaveBeenCalledWith("user-1");
      expect(result).toBe(orgs);
    });

    it("publishes UserInvited and delegates to OrganizationInvitationService.createInvitation", async () => {
      const { service, invitationService, eventPublisher } = buildService();
      invitationService.createInvitation.mockResolvedValue({ message: "invited" });

      const result = await service.inviteToOrganization("org-1", "invitee@example.com", "VIEWER", "admin-1");

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        "UserInvited",
        expect.objectContaining({ organizationId: "org-1", email: "invitee@example.com" }),
      );
      expect(invitationService.createInvitation).toHaveBeenCalledWith(
        "org-1",
        "invitee@example.com",
        "VIEWER",
        "admin-1",
        {},
        {},
      );
      expect(result).toEqual({ message: "invited" });
    });
  });

  describe("setPrimaryOrganization", () => {
    it("updates the profile's default organization and logs an audit entry", async () => {
      const { service, profileRepository, auditService } = buildService();
      const profile = { userId: "user-1", defaultOrganizationId: "org-1" } as unknown as Profile;
      profileRepository.setDefaultOrganization.mockResolvedValue(profile);

      const result = await service.setPrimaryOrganization("user-1", "org-1", "admin-1");

      expect(profileRepository.setDefaultOrganization).toHaveBeenCalledWith("user-1", "org-1");
      expect(auditService.log).toHaveBeenCalledWith(
        "user.primary_organization_set",
        expect.objectContaining({ entityId: "user-1", metadata: { organizationId: "org-1" } }),
      );
      expect(result).toBe(profile);
    });
  });
});
