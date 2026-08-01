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

  /**
   * Module 003 addition (additive). Used by OrganizationDashboardService's
   * "Recent Activity" dashboard section — every organization-scoped audit
   * entry already logs entityType: "Organization", entityId: organizationId
   * (see OrganizationService/OrganizationMembershipService's
   * auditService.log() calls), so this is a direct, reusable read over
   * data that already exists rather than a new logging path.
   */
  findByEntity(entityType: string, entityId: string, take = 20): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }
}
