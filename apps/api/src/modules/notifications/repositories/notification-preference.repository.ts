import { Injectable } from "@nestjs/common";
import { prisma, NotificationPreference, NotificationChannel, ScheduleFrequency, DbClient } from "@rmsm/database";

export interface UpsertPreferenceInput {
  userId: string;
  organizationId: string;
  categoryId?: string | null;
  channel?: NotificationChannel | null;
  enabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  digestFrequency?: ScheduleFrequency;
}

@Injectable()
export class NotificationPreferenceRepository {
  /**
   * NOT `upsert` on the [userId, organizationId, categoryId, channel]
   * compound key — `categoryId` and `channel` are both nullable
   * ("applies to all categories"/"applies to all channels" wildcards),
   * and Prisma 5.22 cannot construct a compound-key `where` clause with
   * an explicit `null` component (the same limitation fixed repeatedly
   * across this project: `RbacService.assignRole`, the TS2742-regression
   * fix, `PermissionHelper.grantPlatformRole`). Applied proactively here
   * — `findFirst` + conditional `create`/`update` — rather than waiting
   * to hit the bug a fifth time.
   */
  async upsert(input: UpsertPreferenceInput, client: DbClient = prisma): Promise<NotificationPreference> {
    const existing = await client.notificationPreference.findFirst({
      where: {
        userId: input.userId,
        organizationId: input.organizationId,
        categoryId: input.categoryId ?? null,
        channel: input.channel ?? null,
      },
    });

    if (existing) {
      return client.notificationPreference.update({
        where: { id: existing.id },
        data: {
          enabled: input.enabled,
          quietHoursStart: input.quietHoursStart,
          quietHoursEnd: input.quietHoursEnd,
          timezone: input.timezone,
          digestFrequency: input.digestFrequency,
        },
      });
    }

    return client.notificationPreference.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId,
        categoryId: input.categoryId,
        channel: input.channel,
        enabled: input.enabled,
        quietHoursStart: input.quietHoursStart,
        quietHoursEnd: input.quietHoursEnd,
        timezone: input.timezone,
        digestFrequency: input.digestFrequency,
      },
    });
  }

  findByUser(userId: string, organizationId: string, client: DbClient = prisma): Promise<NotificationPreference[]> {
    return client.notificationPreference.findMany({ where: { userId, organizationId } });
  }

  /**
   * Returns every preference row that could apply to this exact
   * (category, channel) combination — the specific row plus both
   * wildcard rows (category=null, channel=null, and both=null).
   * Resolution order (most-specific-wins) is PreferenceService's job
   * (Phase 2c), not this repository's — it returns candidates, not a
   * decision.
   */
  findApplicable(
    userId: string,
    organizationId: string,
    categoryId: string | null,
    channel: NotificationChannel,
    client: DbClient = prisma,
  ): Promise<NotificationPreference[]> {
    return client.notificationPreference.findMany({
      where: {
        userId,
        organizationId,
        OR: [
          { categoryId, channel },
          { categoryId: null, channel },
          { categoryId, channel: null },
          { categoryId: null, channel: null },
        ],
      },
    });
  }

  deleteById(id: string, client: DbClient = prisma): Promise<NotificationPreference> {
    return client.notificationPreference.delete({ where: { id } });
  }
}
