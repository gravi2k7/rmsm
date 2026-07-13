import { Injectable } from "@nestjs/common";
import { toInputJsonValue } from "@rmsm/shared";
import {
  prisma,
  Notification,
  NotificationWithDeliveries,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  OrganizationRole,
  DbClient,
} from "@rmsm/database";

export interface CreateNotificationInput {
  organizationId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  categoryId?: string;
  templateId?: string;
  recipientUserId?: string;
  recipientRole?: OrganizationRole;
  recipientPermission?: string;
  topic?: string;
  subject?: string;
  body: string;
  data?: Record<string, unknown>;
  locale?: string;
  scheduledFor?: Date;
  createdById?: string;
}

export interface NotificationListFilters {
  status?: NotificationStatus;
  channel?: NotificationChannel;
  categoryId?: string;
  /** Case-insensitive substring match on subject/body. */
  search?: string;
}

export interface PageParams {
  take: number;
  skip: number;
}

/**
 * Repository Pattern — single-table (`notifications`), zero business
 * logic. "Audit integration" (per this phase's deliverables) means
 * correct `createdById`/`updatedById` plumbing and a shape Phase 2c's
 * NotificationService can wrap with `AuditService.log()` calls after
 * every mutation — this repository does not call AuditService itself,
 * preserving the repository/service boundary every prior module in this
 * project has kept (Module 003's explicit "business logic only in
 * services" rule). Every method accepts an optional `client: DbClient`
 * for transaction composition, same pattern as every repository since
 * Module 002.
 */
@Injectable()
export class NotificationRepository {
  create(data: CreateNotificationInput, client: DbClient = prisma): Promise<Notification> {
    return client.notification.create({
      data: {
        organizationId: data.organizationId,
        type: data.type,
        channel: data.channel,
        priority: data.priority,
        categoryId: data.categoryId,
        templateId: data.templateId,
        recipientUserId: data.recipientUserId,
        recipientRole: data.recipientRole,
        recipientPermission: data.recipientPermission,
        topic: data.topic,
        subject: data.subject,
        body: data.body,
        data: data.data !== undefined ? toInputJsonValue(data.data) : undefined,
        locale: data.locale,
        scheduledFor: data.scheduledFor,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
    });
  }

  /** Excludes soft-deleted notifications. */
  findById(id: string, client: DbClient = prisma): Promise<Notification | null> {
    return client.notification.findFirst({ where: { id, deletedAt: null } });
  }

  findByIdWithDeliveries(id: string, client: DbClient = prisma): Promise<NotificationWithDeliveries | null> {
    return client.notification.findFirst({
      where: { id, deletedAt: null },
      include: { deliveries: true },
    });
  }

  findByRecipient(
    userId: string,
    organizationId: string,
    filters: NotificationListFilters,
    page: PageParams,
    client: DbClient = prisma,
  ): Promise<Notification[]> {
    return client.notification.findMany({
      where: {
        recipientUserId: userId,
        organizationId,
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.channel ? { channel: filters.channel } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.search
          ? {
              OR: [
                { subject: { contains: filters.search, mode: "insensitive" } },
                { body: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: page.take,
      skip: page.skip,
    });
  }

  countByRecipient(
    userId: string,
    organizationId: string,
    filters: NotificationListFilters,
    client: DbClient = prisma,
  ): Promise<number> {
    return client.notification.count({
      where: {
        recipientUserId: userId,
        organizationId,
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.channel ? { channel: filters.channel } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.search
          ? {
              OR: [
                { subject: { contains: filters.search, mode: "insensitive" } },
                { body: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    });
  }

  /** Admin/organization-wide listing — not scoped to one recipient. */
  findByOrganization(
    organizationId: string,
    filters: NotificationListFilters,
    page: PageParams,
    client: DbClient = prisma,
  ): Promise<Notification[]> {
    return client.notification.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.channel ? { channel: filters.channel } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.search
          ? {
              OR: [
                { subject: { contains: filters.search, mode: "insensitive" } },
                { body: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: page.take,
      skip: page.skip,
    });
  }

  countByOrganization(organizationId: string, filters: NotificationListFilters, client: DbClient = prisma): Promise<number> {
    return client.notification.count({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.channel ? { channel: filters.channel } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      },
    });
  }

  updateStatus(id: string, status: NotificationStatus, client: DbClient = prisma): Promise<Notification> {
    return client.notification.update({
      where: { id },
      data: { status, ...(status === "SENT" ? { sentAt: new Date() } : {}) },
    });
  }

  markRead(id: string, client: DbClient = prisma): Promise<Notification> {
    return client.notification.update({
      where: { id },
      data: { status: "READ", readAt: new Date() },
    });
  }

  markArchived(id: string, client: DbClient = prisma): Promise<Notification> {
    return client.notification.update({
      where: { id },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
  }

  softDelete(id: string, client: DbClient = prisma): Promise<Notification> {
    return client.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** For NotificationScheduler (Phase 2c): scheduled notifications whose send time has arrived. */
  findScheduledDue(before: Date, client: DbClient = prisma): Promise<Notification[]> {
    return client.notification.findMany({
      where: { status: "PENDING", scheduledFor: { lte: before }, deletedAt: null },
    });
  }
}
