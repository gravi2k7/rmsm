import { Injectable } from "@nestjs/common";
import type { Session } from "@rmsm/database";
import type { PaginatedResult, OffsetPaginationQuery } from "@rmsm/database";
import { NotFoundError } from "@rmsm/shared";
import { SessionRepository } from "../repositories/session.repository";
import { LoginHistoryRepository } from "../repositories/login-history.repository";
import { UserRepository } from "../repositories/user.repository";
import { AuditService } from "./audit.service";
import { DeviceInfoService, type DeviceInfo } from "./device-info.service";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { AUTH_EVENTS } from "../events";

export interface SessionWithDevice extends Session {
  device: DeviceInfo;
}

export interface SecurityDashboard {
  userId: string;
  activeSessionCount: number;
  trustedDeviceCount: number;
  recentFailedLoginCount: number;
  locked: boolean;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
}

/**
 * Module 004 Domain 3 — admin-facing session/device management, layered on
 * top of the pre-existing, unmodified self-service `SessionService`
 * (`GET/DELETE /sessions*`, unchanged). Every method here is scoped to
 * "an admin acting on any user's sessions" rather than "a user acting on
 * their own" — the two are kept as separate services/controllers to avoid
 * the self-service/admin route collisions documented in
 * `SessionsController`.
 */
@Injectable()
export class SessionManagementService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly loginHistoryRepository: LoginHistoryRepository,
    private readonly userRepository: UserRepository,
    private readonly auditService: AuditService,
    private readonly deviceInfoService: DeviceInfoService,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  private withDevice(session: Session): SessionWithDevice {
    return { ...session, device: this.deviceInfoService.parse(session.userAgent) };
  }

  async list(
    filters: { userId?: string; status?: "active" | "revoked" | "expired" },
    query: OffsetPaginationQuery,
  ): Promise<PaginatedResult<SessionWithDevice>> {
    const result = await this.sessionRepository.findManyAdmin(filters, query);
    return { ...result, data: result.data.map((s) => this.withDevice(s)) };
  }

  async getById(id: string): Promise<SessionWithDevice> {
    const session = await this.sessionRepository.findById(id);
    if (!session) throw new NotFoundError("Session", id);
    return this.withDevice(session);
  }

  async forceLogout(id: string, actorUserId: string): Promise<void> {
    const session = await this.sessionRepository.findById(id);
    if (!session) throw new NotFoundError("Session", id);
    await this.sessionRepository.revoke(id);
    await this.auditService.log("session.force_logout", {
      userId: actorUserId,
      entityType: "Session",
      entityId: id,
      metadata: { targetUserId: session.userId },
    });
    this.eventPublisher.publish(AUTH_EVENTS.SESSION_REVOKED, { sessionId: id, userId: session.userId, actorId: actorUserId });
  }

  async logoutAllForUser(userId: string, actorUserId: string): Promise<{ count: number }> {
    const result = await this.sessionRepository.revokeAllForUser(userId);
    await this.auditService.log("session.logout_all_devices", {
      userId: actorUserId,
      entityType: "User",
      entityId: userId,
      metadata: { count: result.count },
    });
    this.eventPublisher.publish(AUTH_EVENTS.SESSION_REVOKED, { userId, bulk: true, count: result.count, actorId: actorUserId });
    return { count: result.count };
  }

  async setTrusted(id: string, trusted: boolean, actorUserId: string): Promise<SessionWithDevice> {
    const session = await this.sessionRepository.findById(id);
    if (!session) throw new NotFoundError("Session", id);
    const updated = await this.sessionRepository.setTrusted(id, trusted);
    await this.auditService.log(trusted ? "session.trusted" : "session.untrusted", {
      userId: actorUserId,
      entityType: "Session",
      entityId: id,
      metadata: { targetUserId: session.userId },
    });
    return this.withDevice(updated);
  }

  listSessionsForUser(userId: string): Promise<SessionWithDevice[]> {
    return this.sessionRepository.findActiveByUser(userId).then((sessions) => sessions.map((s) => this.withDevice(s)));
  }

  loginHistoryForUser(userId: string, query: OffsetPaginationQuery) {
    return this.loginHistoryRepository.findByUser(userId, query);
  }

  failedLoginHistory(filters: { userId?: string; email?: string }, query: OffsetPaginationQuery) {
    return this.loginHistoryRepository.search({ ...filters, success: false }, query);
  }

  async getSecurityDashboard(userId: string): Promise<SecurityDashboard> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError("User", userId);
    const [activeSessions, allSessions, recentFailedLoginCount] = await Promise.all([
      this.sessionRepository.countActiveForUser(userId),
      this.sessionRepository.findActiveByUser(userId),
      this.loginHistoryRepository.countRecentFailures(userId, 60),
    ]);
    const trustedDeviceCount = allSessions.filter((s) => s.trustedAt !== null).length;
    return {
      userId,
      activeSessionCount: activeSessions,
      trustedDeviceCount,
      recentFailedLoginCount,
      locked: user.lockedUntil !== null && user.lockedUntil > new Date(),
      lockedUntil: user.lockedUntil,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
