import { Injectable } from "@nestjs/common";
import { prisma, DeviceToken, DevicePlatform, DbClient } from "@rmsm/database";

export interface RegisterDeviceTokenInput {
  userId: string;
  organizationId?: string;
  platform: DevicePlatform;
  token: string;
  pushProviderId?: string;
}

@Injectable()
export class DeviceTokenRepository {
  /**
   * `token` alone is `@unique` and non-nullable — this compound-key
   * limitation this project has hit repeatedly (see
   * NotificationPreferenceRepository's comment) does not apply to a
   * single, required unique field. A real `upsert` is correct and safe
   * here: registering the same device token twice (e.g. app reinstall,
   * token refresh) should reactivate the existing row, not create a
   * duplicate.
   */
  upsert(data: RegisterDeviceTokenInput, client: DbClient = prisma): Promise<DeviceToken> {
    return client.deviceToken.upsert({
      where: { token: data.token },
      update: {
        userId: data.userId,
        organizationId: data.organizationId,
        platform: data.platform,
        pushProviderId: data.pushProviderId,
        isActive: true,
        lastUsedAt: new Date(),
        deletedAt: null,
      },
      create: data,
    });
  }

  findByToken(token: string, client: DbClient = prisma): Promise<DeviceToken | null> {
    return client.deviceToken.findUnique({ where: { token } });
  }

  findActiveByUser(userId: string, client: DbClient = prisma): Promise<DeviceToken[]> {
    return client.deviceToken.findMany({
      where: { userId, isActive: true, deletedAt: null },
    });
  }

  /** Called when a push provider reports a token as invalid/expired (Phase 1's PushInvalidTokenError) — deactivates without deleting, preserving history. */
  deactivate(id: string, client: DbClient = prisma): Promise<DeviceToken> {
    return client.deviceToken.update({ where: { id }, data: { isActive: false } });
  }

  softDelete(id: string, client: DbClient = prisma): Promise<DeviceToken> {
    return client.deviceToken.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}
