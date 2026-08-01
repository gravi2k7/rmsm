import { Injectable } from "@nestjs/common";
import { prisma, Session, Prisma } from "@rmsm/database";

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
}
