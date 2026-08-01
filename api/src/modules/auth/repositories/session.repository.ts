import { Injectable } from "@nestjs/common";
import { prisma, Session, Prisma } from "@rmsm/database";
import { paginate, type PaginatedResult, type OffsetPaginationQuery } from "@rmsm/database";

@Injectable()
export class SessionRepository {
  create(data: {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    deviceLabel?: string;
    expiresAt: Date;
  }): Promise<Session> {
    return prisma.session.create({ data });
  }

  findById(id: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { id } });
  }

  findActiveByUser(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
    });
  }

  touch(id: string): Promise<Session> {
    return prisma.session.update({ where: { id }, data: { lastSeenAt: new Date() } });
  }

  revoke(id: string): Promise<Session> {
    return prisma.session.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  revokeAllForUser(userId: string, exceptSessionId?: string): Promise<Prisma.BatchPayload> {
    return prisma.session.updateMany({
      where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Module 003 addition (additive). Used by OrganizationDashboardService's
   * "Active Sessions" dashboard metric — `Session` has no `organizationId`
   * column (sessions are user-scoped, not organization-scoped, by design;
   * see the Session model comment in schema.prisma), so the dashboard
   * resolves the organization's active member user ids first
   * (OrganizationMembershipRepository.findActiveByOrganization) and passes
   * them here rather than this repository knowing anything about
   * organizations.
   */
  countActiveByUserIds(userIds: string[]): Promise<number> {
    if (userIds.length === 0) return Promise.resolve(0);
    return prisma.session.count({
      where: { userId: { in: userIds }, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  /**
   * Module 004 addition — single-user variant of `countActiveByUserIds`,
   * used by the admin Session Security Dashboard (Domain 3) and by
   * concurrent-session-limit reporting (informational only today; no
   * enforcement is wired in — see the `trustedAt` column comment for the
   * same "reporting, not enforcement" pattern).
   */
  countActiveForUser(userId: string): Promise<number> {
    return prisma.session.count({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  /**
   * Module 004 addition — admin-wide session listing (Domain 3's "Active
   * Sessions" admin view), optionally scoped to one user. Uses the
   * canonical `paginate()` helper (see `LoginHistoryRepository` for the
   * precedent). `status` is a derived filter (Session has no `status`
   * column): "active" = not revoked and not expired, "revoked" = has
   * `revokedAt`, "expired" = `expiresAt` in the past and not revoked.
   */
  findManyAdmin(
    filters: { userId?: string; status?: "active" | "revoked" | "expired" },
    query: OffsetPaginationQuery,
  ): Promise<PaginatedResult<Session>> {
    const now = new Date();
    let statusWhere: Prisma.SessionWhereInput = {};
    if (filters.status === "active") {
      statusWhere = { revokedAt: null, expiresAt: { gt: now } };
    } else if (filters.status === "revoked") {
      statusWhere = { revokedAt: { not: null } };
    } else if (filters.status === "expired") {
      statusWhere = { revokedAt: null, expiresAt: { lte: now } };
    }
    const where: Prisma.SessionWhereInput = {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...statusWhere,
    };
    return paginate(
      {
        findMany: (args) => prisma.session.findMany({ ...args, orderBy: { lastSeenAt: "desc" } }),
        count: (args) => prisma.session.count(args),
      },
      where,
      query,
    );
  }

  /**
   * Module 004 addition — mark/unmark a device as "trusted" (Domain 3's
   * Trusted Devices feature). Purely informational today; see the
   * `trustedAt` column comment in schema.prisma.
   */
  setTrusted(id: string, trusted: boolean): Promise<Session> {
    return prisma.session.update({ where: { id }, data: { trustedAt: trusted ? new Date() : null } });
  }
}
