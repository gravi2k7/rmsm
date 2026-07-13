import { Injectable } from "@nestjs/common";
import { toInputJsonValue } from "@rmsm/shared";
import { prisma, NotificationWebhook, DbClient } from "@rmsm/database";

export interface CreateNotificationWebhookInput {
  organizationId: string;
  url: string;
  secretEnc: string;
  eventTypes: string[];
  createdById?: string;
}

/** Phase 2c addition — deferred in Phase 2a, built now because its corresponding service (WebhookService, outbound-triggering) is built this phase. Distinct from the future inbound provider-callback controller, which this repository has nothing to do with. */
@Injectable()
export class NotificationWebhookRepository {
  create(data: CreateNotificationWebhookInput, client: DbClient = prisma): Promise<NotificationWebhook> {
    return client.notificationWebhook.create({
      data: { ...data, eventTypes: toInputJsonValue(data.eventTypes) },
    });
  }

  /**
   * The dispatch-time lookup WebhookService needs: every active webhook
   * subscription for this organization whose eventTypes array contains
   * the event that just occurred. `eventTypes` is JSON, not a relational
   * column, so the containment filter is applied in application code
   * (fetch active rows, filter in memory) rather than a database-level
   * JSON query — organizations realistically have a handful of webhook
   * subscriptions, not thousands, so this is a deliberate simplicity
   * choice, not a scalability gap.
   */
  async findActiveByOrganization(
    organizationId: string,
    eventType: string,
    client: DbClient = prisma,
  ): Promise<NotificationWebhook[]> {
    const rows = await client.notificationWebhook.findMany({
      where: { organizationId, isActive: true, deletedAt: null },
    });
    return rows.filter((row: NotificationWebhook) => (row.eventTypes as unknown as string[]).includes(eventType));
  }

  updateLastTriggered(id: string, status: string, client: DbClient = prisma): Promise<NotificationWebhook> {
    return client.notificationWebhook.update({
      where: { id },
      data: { lastTriggeredAt: new Date(), lastStatus: status },
    });
  }

  softDelete(id: string, client: DbClient = prisma): Promise<NotificationWebhook> {
    return client.notificationWebhook.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}
