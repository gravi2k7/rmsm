import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { MOD005_EVENTS } from "../../../common/events/mod005-events";
import { WebhookService } from "./webhook.service";

/**
 * The missing wire between Module 005's platform-wide domain events
 * (published via the shared DomainEventPublisher) and each organization's
 * OWN outbound webhook subscriptions (WebhookService.triggerForEvent,
 * which existed but — per notification.service.ts's own doc comment,
 * "called by whatever domain event actually occurred... not something
 * NotificationService itself initiates" — nothing ever actually called
 * it before this phase). Subscribes once at boot to every
 * organization-scoped Module 005 event and forwards it to
 * `triggerForEvent`, which itself looks up that organization's active
 * webhook subscriptions and fires the ones subscribed to this event type.
 * Deliberately excludes NotificationSent/NotificationFailed/
 * WebhookDelivered/WebhookFailed from the forwarded set — forwarding a
 * webhook's own delivery outcome back into the webhook dispatcher would
 * be a feedback loop, not a real integration.
 */
@Injectable()
export class WebhookEventBridge implements OnModuleInit {
  private readonly logger = new Logger(WebhookEventBridge.name);

  private static readonly FORWARDED_EVENTS: readonly string[] = [
    MOD005_EVENTS.SUBSCRIPTION_CREATED,
    MOD005_EVENTS.SUBSCRIPTION_UPDATED,
    MOD005_EVENTS.SUBSCRIPTION_CANCELLED,
    MOD005_EVENTS.INVOICE_GENERATED,
    MOD005_EVENTS.PAYMENT_SUCCEEDED,
    MOD005_EVENTS.PAYMENT_FAILED,
    MOD005_EVENTS.COUPON_CREATED,
    MOD005_EVENTS.COUPON_REDEEMED,
    MOD005_EVENTS.LICENSE_ASSIGNED,
  ];

  constructor(
    private readonly eventPublisher: DomainEventPublisher,
    private readonly webhookService: WebhookService,
  ) {}

  onModuleInit(): void {
    for (const eventName of WebhookEventBridge.FORWARDED_EVENTS) {
      this.eventPublisher.on(eventName, (payload) => {
        const organizationId = payload.organizationId;
        if (typeof organizationId !== "string") {
          // CouponCreated (platform-wide coupon issuance) has no
          // organizationId — nothing to forward to.
          return;
        }
        this.webhookService.triggerForEvent(organizationId, eventName, payload).catch((error: unknown) => {
          this.logger.warn(
            `Webhook forwarding for ${eventName} (org ${organizationId}) failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      });
    }
    this.logger.log(`WebhookEventBridge subscribed to ${WebhookEventBridge.FORWARDED_EVENTS.length} Module 005 events.`);
  }
}
