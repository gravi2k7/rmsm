import { NotFoundError } from "@rmsm/shared";
import type { Session, UserWithProfile } from "@rmsm/database";
import { SessionManagementService } from "../session-management.service";
import type { SessionRepository } from "../../repositories/session.repository";
import type { LoginHistoryRepository } from "../../repositories/login-history.repository";
import type { UserRepository } from "../../repositories/user.repository";
import type { AuditService } from "../audit.service";
import { DeviceInfoService } from "../device-info.service";
import type { DomainEventPublisher } from "../../../../common/events/domain-event-publisher.service";

/**
 * Module 004 Domain 3 unit coverage for SessionManagementService —
 * hand-rolled repository/service mocks, no database required. Uses the
 * real (pure, dependency-free) DeviceInfoService rather than mocking it,
 * since its own spec file already covers its parsing logic directly.
 */
describe("SessionManagementService", () => {
  type SessionRepoMock = jest.Mocked<
    Pick<
      SessionRepository,
      "findManyAdmin" | "findById" | "revoke" | "revokeAllForUser" | "setTrusted" | "findActiveByUser" | "countActiveForUser"
    >
  >;
  type LoginHistoryRepoMock = jest.Mocked<Pick<LoginHistoryRepository, "findByUser" | "search" | "countRecentFailures">>;
  type UserRepoMock = jest.Mocked<Pick<UserRepository, "findById">>;
  type AuditServiceMock = jest.Mocked<Pick<AuditService, "log">>;
  type EventPublisherMock = jest.Mocked<Pick<DomainEventPublisher, "publish">>;

  function buildSession(overrides: Partial<Session> = {}): Session {
    const now = new Date();
    return {
      id: "session-1",
      userId: "user-1",
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      deviceLabel: null,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
      revokedAt: null,
      trustedAt: null,
      ...overrides,
    } as Session;
  }

  function buildService() {
    const sessionRepository: SessionRepoMock = {
      findManyAdmin: jest.fn(),
      findById: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
      setTrusted: jest.fn(),
      findActiveByUser: jest.fn(),
      countActiveForUser: jest.fn(),
    };
    const loginHistoryRepository: LoginHistoryRepoMock = {
      findByUser: jest.fn(),
      search: jest.fn(),
      countRecentFailures: jest.fn(),
    };
    const userRepository: UserRepoMock = { findById: jest.fn() };
    const auditService: AuditServiceMock = { log: jest.fn().mockResolvedValue(undefined) };
    const eventPublisher: EventPublisherMock = { publish: jest.fn() };
    const deviceInfoService = new DeviceInfoService();

    const service = new SessionManagementService(
      sessionRepository as unknown as SessionRepository,
      loginHistoryRepository as unknown as LoginHistoryRepository,
      userRepository as unknown as UserRepository,
      auditService as unknown as AuditService,
      deviceInfoService,
      eventPublisher as unknown as DomainEventPublisher,
    );

    return { service, sessionRepository, loginHistoryRepository, userRepository, auditService, eventPublisher };
  }

  describe("getById", () => {
    it("throws NotFoundError for a missing session", async () => {
      const { service, sessionRepository } = buildService();
      sessionRepository.findById.mockResolvedValue(null);

      await expect(service.getById("missing")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("enriches a found session with parsed device info", async () => {
      const { service, sessionRepository } = buildService();
      sessionRepository.findById.mockResolvedValue(buildSession());

      const result = await service.getById("session-1");

      expect(result.device.browser).toBe("Chrome");
      expect(result.device.os).toBe("Windows");
    });
  });

  describe("forceLogout", () => {
    it("throws NotFoundError for a missing session and never calls revoke", async () => {
      const { service, sessionRepository } = buildService();
      sessionRepository.findById.mockResolvedValue(null);

      await expect(service.forceLogout("missing", "admin-1")).rejects.toBeInstanceOf(NotFoundError);
      expect(sessionRepository.revoke).not.toHaveBeenCalled();
    });

    it("revokes the session, logs an audit entry, and publishes SessionRevoked", async () => {
      const { service, sessionRepository, auditService, eventPublisher } = buildService();
      sessionRepository.findById.mockResolvedValue(buildSession());

      await service.forceLogout("session-1", "admin-1");

      expect(sessionRepository.revoke).toHaveBeenCalledWith("session-1");
      expect(auditService.log).toHaveBeenCalledWith("session.force_logout", expect.objectContaining({ entityId: "session-1" }));
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        "SessionRevoked",
        expect.objectContaining({ sessionId: "session-1", userId: "user-1", actorId: "admin-1" }),
      );
    });
  });

  describe("logoutAllForUser", () => {
    it("revokes every session for the user and logs one bulk audit entry", async () => {
      const { service, sessionRepository, auditService, eventPublisher } = buildService();
      sessionRepository.revokeAllForUser.mockResolvedValue({ count: 4 });

      const result = await service.logoutAllForUser("user-1", "admin-1");

      expect(result).toEqual({ count: 4 });
      expect(auditService.log).toHaveBeenCalledWith(
        "session.logout_all_devices",
        expect.objectContaining({ entityId: "user-1", metadata: { count: 4 } }),
      );
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        "SessionRevoked",
        expect.objectContaining({ userId: "user-1", bulk: true, count: 4 }),
      );
    });
  });

  describe("setTrusted", () => {
    it("marks a session trusted and logs session.trusted", async () => {
      const { service, sessionRepository, auditService } = buildService();
      sessionRepository.findById.mockResolvedValue(buildSession());
      sessionRepository.setTrusted.mockResolvedValue(buildSession({ trustedAt: new Date() }));

      const result = await service.setTrusted("session-1", true, "admin-1");

      expect(sessionRepository.setTrusted).toHaveBeenCalledWith("session-1", true);
      expect(auditService.log).toHaveBeenCalledWith("session.trusted", expect.objectContaining({ entityId: "session-1" }));
      expect(result.device.browser).toBe("Chrome");
    });

    it("throws NotFoundError for a missing session", async () => {
      const { service, sessionRepository } = buildService();
      sessionRepository.findById.mockResolvedValue(null);

      await expect(service.setTrusted("missing", true, "admin-1")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getSecurityDashboard", () => {
    it("composes active session count, trusted device count, and recent failures", async () => {
      const { service, sessionRepository, loginHistoryRepository, userRepository } = buildService();
      const user = { id: "user-1", lockedUntil: null, lastLoginAt: new Date() } as unknown as UserWithProfile;
      userRepository.findById.mockResolvedValue(user);
      sessionRepository.countActiveForUser.mockResolvedValue(2);
      sessionRepository.findActiveByUser.mockResolvedValue([
        buildSession({ id: "s1", trustedAt: new Date() }),
        buildSession({ id: "s2", trustedAt: null }),
      ]);
      loginHistoryRepository.countRecentFailures.mockResolvedValue(1);

      const dashboard = await service.getSecurityDashboard("user-1");

      expect(dashboard).toEqual(
        expect.objectContaining({
          userId: "user-1",
          activeSessionCount: 2,
          trustedDeviceCount: 1,
          recentFailedLoginCount: 1,
          locked: false,
        }),
      );
    });

    it("throws NotFoundError when the user does not exist", async () => {
      const { service, userRepository } = buildService();
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getSecurityDashboard("missing")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("list", () => {
    it("delegates to SessionRepository.findManyAdmin and enriches each row with device info", async () => {
      const { service, sessionRepository } = buildService();
      sessionRepository.findManyAdmin.mockResolvedValue({
        data: [buildSession()],
        pagination: { page: 1, pageSize: 50, totalCount: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      });

      const result = await service.list({}, {});

      expect(result.data[0]?.device.browser).toBe("Chrome");
    });
  });
});
