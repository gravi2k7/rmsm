import { Injectable } from "@nestjs/common";
import { toInputJsonValue } from "@rmsm/shared";
import { prisma, NotificationDigest, ScheduleFrequency, DbClient } from "@rmsm/database";

export interface CreateDigestInput {
  userId: string;
  organizationId: string;
  frequency: ScheduleFrequency;
  categoryKeys?: string[];
  nextScheduledAt?: Date;
}

/** Phase 2c addition — deferred in Phase 2a, built now because its corresponding service (DigestService) is built this phase. */
@Injectable()
export class NotificationDigestRepository {
  /**
   * Unique key [userId, organizationId, frequency] has no nullable
   * component — a real `upsert` is safe here, same reasoning as
   * DeviceTokenRepository's `upsert` (Phase 2a), unlike
   * NotificationPreferenceRepository's deliberately-avoided one.
   */
  upsert(data: CreateDigestInput, client: DbClient = prisma): Promise<NotificationDigest> {
    return client.notificationDigest.upsert({
      where: { userId_organizationId_frequency: { userId: data.userId, organizationId: data.organizationId, frequency: data.frequency } },
      update: {
        categoryKeys: data.categoryKeys !== undefined ? toInputJsonValue(data.categoryKeys) : undefined,
        nextScheduledAt: data.nextScheduledAt,
        isActive: true,
      },
      create: {
        userId: data.userId,
        organizationId: data.organizationId,
        frequency: data.frequency,
        categoryKeys: data.categoryKeys !== undefined ? toInputJsonValue(data.categoryKeys) : undefined,
        nextScheduledAt: data.nextScheduledAt,
      },
    });
  }

  findByUser(userId: string, organizationId: string, client: DbClient = prisma): Promise<NotificationDigest[]> {
    return client.notificationDigest.findMany({ where: { userId, organizationId } });
  }

  /** Phase 2c addition (additive) — needed by DigestService.buildDigest() to look up a single digest by id directly, rather than fetching a user's full list and filtering client-side. */
  findById(id: string, client: DbClient = prisma): Promise<NotificationDigest | null> {
    return client.notificationDigest.findUnique({ where: { id } });
  }

  findDueForSend(before: Date, client: DbClient = prisma): Promise<NotificationDigest[]> {
    return client.notificationDigest.findMany({
      where: { isActive: true, nextScheduledAt: { lte: before } },
    });
  }

  updateLastSent(id: string, sentAt: Date, nextScheduledAt: Date, client: DbClient = prisma): Promise<NotificationDigest> {
    return client.notificationDigest.update({ where: { id }, data: { lastSentAt: sentAt, nextScheduledAt } });
  }

  deactivate(id: string, client: DbClient = prisma): Promise<NotificationDigest> {
    return client.notificationDigest.update({ where: { id }, data: { isActive: false } });
  }
}
