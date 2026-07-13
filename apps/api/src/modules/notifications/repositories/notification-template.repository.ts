import { Injectable } from "@nestjs/common";
import {
  prisma,
  NotificationTemplate,
  NotificationTemplateWithLayout,
  NotificationChannel,
  TemplateFormat,
  DbClient,
} from "@rmsm/database";

export interface CreateNotificationTemplateInput {
  organizationId?: string;
  categoryId?: string;
  key: string;
  name: string;
  description?: string;
  channel: NotificationChannel;
  format?: TemplateFormat;
  subjectTemplate?: string;
  bodyTemplate: string;
  layoutId?: string;
  locale?: string;
  createdById?: string;
}

export interface UpdateNotificationTemplateInput {
  name?: string;
  description?: string | null;
  subjectTemplate?: string | null;
  bodyTemplate?: string;
  layoutId?: string | null;
  isActive?: boolean;
}

export interface TemplateListFilters {
  channel?: NotificationChannel;
  isActive?: boolean;
  search?: string;
}

export interface PageParams {
  take: number;
  skip: number;
}

@Injectable()
export class NotificationTemplateRepository {
  create(data: CreateNotificationTemplateInput, client: DbClient = prisma): Promise<NotificationTemplate> {
    return client.notificationTemplate.create({
      data: { ...data, updatedById: data.createdById },
    });
  }

  findById(id: string, client: DbClient = prisma): Promise<NotificationTemplate | null> {
    return client.notificationTemplate.findFirst({ where: { id, deletedAt: null } });
  }

  findByIdWithLayout(id: string, client: DbClient = prisma): Promise<NotificationTemplateWithLayout | null> {
    return client.notificationTemplate.findFirst({
      where: { id, deletedAt: null },
      include: { layout: true },
    });
  }

  /** `organizationId: null` looks up a platform-wide template. */
  findByKey(
    organizationId: string | null,
    key: string,
    locale: string,
    client: DbClient = prisma,
  ): Promise<NotificationTemplate | null> {
    return client.notificationTemplate.findFirst({
      where: { organizationId, key, locale, deletedAt: null, isActive: true },
    });
  }

  findByOrganization(
    organizationId: string,
    filters: TemplateListFilters,
    page: PageParams,
    client: DbClient = prisma,
  ): Promise<NotificationTemplate[]> {
    return client.notificationTemplate.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.channel ? { channel: filters.channel } : {}),
        ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { key: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: page.take,
      skip: page.skip,
    });
  }

  countByOrganization(organizationId: string, filters: TemplateListFilters, client: DbClient = prisma): Promise<number> {
    return client.notificationTemplate.count({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.channel ? { channel: filters.channel } : {}),
        ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
    });
  }

  update(
    id: string,
    data: UpdateNotificationTemplateInput,
    updatedById: string | undefined,
    client: DbClient = prisma,
  ): Promise<NotificationTemplate> {
    return client.notificationTemplate.update({
      where: { id },
      data: { ...data, updatedById, version: { increment: 1 } },
    });
  }

  softDelete(id: string, updatedById: string | undefined, client: DbClient = prisma): Promise<NotificationTemplate> {
    return client.notificationTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedById },
    });
  }
}
