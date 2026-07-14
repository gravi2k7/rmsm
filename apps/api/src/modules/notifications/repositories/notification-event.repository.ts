import { Injectable } from "@nestjs/common";
import { toInputJsonValue } from "@rmsm/shared";
import { prisma, NotificationEvent, DbClient } from "@rmsm/database";

export interface CreateNotificationEventInput {
  notificationId: string;
  deliveryId?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}

/** Append-only — intentionally has no update/delete methods, same discipline as OrganizationMembershipEventRepository (Module 003) and PaymentWebhookRepository (Module 004). This is the durable event timeline; nothing should ever mutate a past event. */
@Injectable()
export class NotificationEventRepository {
  create(data: CreateNotificationEventInput, client: DbClient = prisma): Promise<NotificationEvent> {
    return client.notificationEvent.create({
      data: {
        notificationId: data.notificationId,
        deliveryId: data.deliveryId,
        eventType: data.eventType,
        metadata: data.metadata !== undefined ? toInputJsonValue(data.metadata) : undefined,
        occurredAt: data.occurredAt,
      },
    });
  }

  findByNotification(notificationId: string, client: DbClient = prisma): Promise<NotificationEvent[]> {
    return client.notificationEvent.findMany({
      where: { notificationId },
      orderBy: { occurredAt: "asc" },
    });
  }

  findByDelivery(deliveryId: string, client: DbClient = prisma): Promise<NotificationEvent[]> {
    return client.notificationEvent.findMany({
      where: { deliveryId },
      orderBy: { occurredAt: "asc" },
    });
  }
}
