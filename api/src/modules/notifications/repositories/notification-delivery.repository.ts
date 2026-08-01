import { Injectable } from "@nestjs/common";
import { prisma, NotificationDelivery, NotificationChannel, DeliveryStatus, DbClient } from "@rmsm/database";

export interface CreateDeliveryInput {
  notificationId: string;
  channel: NotificationChannel;
  emailProviderId?: string;
  smsProviderId?: string;
  pushProviderId?: string;
}

@Injectable()
export class NotificationDeliveryRepository {
  create(data: CreateDeliveryInput, client: DbClient = prisma): Promise<NotificationDelivery> {
    return client.notificationDelivery.create({ data });
  }

  /** Phase 2c addition (additive) — needed by TrackingService to resolve a delivery's parent notification id when recording an event. */
  findById(id: string, client: DbClient = prisma): Promise<NotificationDelivery | null> {
    return client.notificationDelivery.findUnique({ where: { id } });
  }

  findByNotification(notificationId: string, client: DbClient = prisma): Promise<NotificationDelivery[]> {
    return client.notificationDelivery.findMany({ where: { notificationId } });
  }

  /** The correlation lookup inbound provider webhooks need — "which delivery does this bounce/open/click event belong to." */
  findByProviderMessageId(providerMessageId: string, client: DbClient = prisma): Promise<NotificationDelivery | null> {
    return client.notificationDelivery.findFirst({ where: { providerMessageId } });
  }

  updateStatus(
    id: string,
    status: DeliveryStatus,
    extra: { providerMessageId?: string; failureReason?: string } = {},
    client: DbClient = prisma,
  ): Promise<NotificationDelivery> {
    const timestampField =
      status === "DELIVERED"
        ? { deliveredAt: new Date() }
        : status === "OPENED"
          ? { openedAt: new Date() }
          : status === "CLICKED"
            ? { clickedAt: new Date() }
            : status === "BOUNCED"
              ? { bouncedAt: new Date() }
              : {};
    return client.notificationDelivery.update({
      where: { id },
      data: { status, ...extra, ...timestampField },
    });
  }

  incrementAttempts(id: string, client: DbClient = prisma): Promise<NotificationDelivery> {
    return client.notificationDelivery.update({
      where: { id },
      data: { attempts: { increment: 1 }, lastAttemptAt: new Date() },
    });
  }

  /** Module 005 addition — Domain 3's "Delivery Dashboard" needs aggregate counts by channel/status; nothing here provided that before (every existing method reads a single notification's deliveries). */
  async countByChannelAndStatus(
    client: DbClient = prisma,
  ): Promise<{ channel: NotificationChannel; status: DeliveryStatus; count: number }[]> {
    const rows = await client.notificationDelivery.groupBy({
      by: ["channel", "status"],
      _count: { _all: true },
    });
    return rows.map((r: { channel: NotificationChannel; status: DeliveryStatus; _count: { _all: number } }) => ({
      channel: r.channel,
      status: r.status,
      count: r._count._all,
    }));
  }
}
