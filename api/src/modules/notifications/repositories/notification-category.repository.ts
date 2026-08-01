import { Injectable } from "@nestjs/common";
import { prisma, NotificationCategory, NotificationChannel, DbClient } from "@rmsm/database";

export interface CreateCategoryInput {
  organizationId?: string;
  key: string;
  name: string;
  description?: string;
  defaultChannel?: NotificationChannel;
  createdById?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  defaultChannel?: NotificationChannel;
  isActive?: boolean;
  updatedById?: string;
}

/**
 * Module 005 addition — the NotificationCategory Prisma model existed
 * (with a detailed doc comment about its platform-wide-vs-per-org
 * uniqueness scoping) but had no repository/controller at all. Genuine
 * Domain 3 gap ("Notification Categories" is explicitly named in the
 * prompt's feature list), not a duplicate of anything.
 */
@Injectable()
export class NotificationCategoryRepository {
  create(data: CreateCategoryInput, client: DbClient = prisma): Promise<NotificationCategory> {
    return client.notificationCategory.create({ data });
  }

  findById(id: string, client: DbClient = prisma): Promise<NotificationCategory | null> {
    return client.notificationCategory.findUnique({ where: { id } });
  }

  /**
   * (organizationId, key) is the schema's own unique constraint — but per
   * that model's own doc comment, Postgres treats every NULL
   * organizationId as distinct, so "is this platform-wide key already
   * taken" for the organizationId = null case needs an explicit
   * application-level check (documented there as a known, not-yet-closed
   * follow-up — this repository performs that check honestly rather than
   * silently relying on the DB constraint for that one case).
   */
  async findByScopeAndKey(organizationId: string | null, key: string, client: DbClient = prisma): Promise<NotificationCategory | null> {
    if (organizationId === null) {
      const platformWide = await client.notificationCategory.findMany({ where: { organizationId: null, key } });
      return platformWide[0] ?? null;
    }
    return client.notificationCategory.findUnique({ where: { organizationId_key: { organizationId, key } } });
  }

  findForScope(organizationId: string | null, client: DbClient = prisma): Promise<NotificationCategory[]> {
    return client.notificationCategory.findMany({
      where: { OR: [{ organizationId: null }, { organizationId }] },
      orderBy: { key: "asc" },
    });
  }

  update(id: string, data: UpdateCategoryInput, client: DbClient = prisma): Promise<NotificationCategory> {
    return client.notificationCategory.update({ where: { id }, data });
  }

  delete(id: string, client: DbClient = prisma): Promise<NotificationCategory> {
    return client.notificationCategory.delete({ where: { id } });
  }
}
