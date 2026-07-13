import { Injectable } from "@nestjs/common";
import { toInputJsonValue } from "@rmsm/shared";
import { prisma, NotificationLog, DbClient } from "@rmsm/database";

export interface CreateNotificationLogInput {
  organizationId: string;
  notificationId?: string;
  action: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

/** Append-only — same reasoning as NotificationEventRepository. Distinct from Module 002's platform AuditLog: this is a domain-specific, product-facing operational log (Phase 1's ADR discussion), not a compliance audit trail. */
@Injectable()
export class NotificationLogRepository {
  create(data: CreateNotificationLogInput, client: DbClient = prisma): Promise<NotificationLog> {
    return client.notificationLog.create({
      data: {
        organizationId: data.organizationId,
        notificationId: data.notificationId,
        action: data.action,
        actorId: data.actorId,
        metadata: data.metadata !== undefined ? toInputJsonValue(data.metadata) : undefined,
      },
    });
  }

  findByOrganization(organizationId: string, take: number, skip: number, client: DbClient = prisma): Promise<NotificationLog[]> {
    return client.notificationLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });
  }

  findByNotification(notificationId: string, client: DbClient = prisma): Promise<NotificationLog[]> {
    return client.notificationLog.findMany({
      where: { notificationId },
      orderBy: { createdAt: "desc" },
    });
  }
}
