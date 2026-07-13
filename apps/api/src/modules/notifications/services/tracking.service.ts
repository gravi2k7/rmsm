import { Injectable } from "@nestjs/common";
import { NotFoundError } from "@rmsm/shared";
import { NotificationDeliveryRepository } from "../repositories/notification-delivery.repository";
import { NotificationEventRepository } from "../repositories/notification-event.repository";

export interface DeliveryStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
}

/** Records open/click/bounce events — the read side of Delivery Tracking (spec Section: "Open tracking, Click tracking, Bounce tracking"). Every write here also appends a NotificationEvent row, so the full timeline is queryable independent of the delivery row's current-state columns. */
@Injectable()
export class TrackingService {
  constructor(
    private readonly deliveryRepository: NotificationDeliveryRepository,
    private readonly eventRepository: NotificationEventRepository,
  ) {}

  async recordOpen(deliveryId: string): Promise<void> {
    const notificationId = await this.notificationIdFor(deliveryId);
    await this.deliveryRepository.updateStatus(deliveryId, "OPENED");
    await this.eventRepository.create({ notificationId, deliveryId, eventType: "opened" });
  }

  async recordClick(deliveryId: string, url: string): Promise<void> {
    const notificationId = await this.notificationIdFor(deliveryId);
    await this.deliveryRepository.updateStatus(deliveryId, "CLICKED");
    await this.eventRepository.create({ notificationId, deliveryId, eventType: "clicked", metadata: { url } });
  }

  async recordBounce(deliveryId: string, reason: string, isPermanent: boolean): Promise<void> {
    const notificationId = await this.notificationIdFor(deliveryId);
    await this.deliveryRepository.updateStatus(deliveryId, "BOUNCED", { failureReason: reason });
    await this.eventRepository.create({
      notificationId,
      deliveryId,
      eventType: "bounced",
      metadata: { reason, isPermanent },
    });
  }

  async getDeliveryStats(notificationId: string): Promise<DeliveryStats> {
    const events = await this.eventRepository.findByNotification(notificationId);
    return {
      sent: events.filter((e) => e.eventType === "sent").length,
      delivered: events.filter((e) => e.eventType === "delivered").length,
      opened: events.filter((e) => e.eventType === "opened").length,
      clicked: events.filter((e) => e.eventType === "clicked").length,
      bounced: events.filter((e) => e.eventType === "bounced").length,
    };
  }

  private async notificationIdFor(deliveryId: string): Promise<string> {
    const delivery = await this.deliveryRepository.findById(deliveryId);
    if (!delivery) throw new NotFoundError("NotificationDelivery", deliveryId);
    return delivery.notificationId;
  }
}
