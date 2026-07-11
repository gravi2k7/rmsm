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
}
