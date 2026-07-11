import { Injectable } from "@nestjs/common";
import { prisma, Prisma, AuditLog } from "@rmsm/database";

@Injectable()
export class AuditLogRepository {
  create(data: {
    userId?: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    return prisma.auditLog.create({ data });
  }

  findByUser(userId: string, take = 50): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }
}
