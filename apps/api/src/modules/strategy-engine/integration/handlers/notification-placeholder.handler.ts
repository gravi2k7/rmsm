import { Injectable, Logger } from "@nestjs/common";
import type { IntegrationEventHandler } from "./integration-event-handler.interface";
import type { IntegrationEvent } from "../events/integration-event.interface";

/** Named explicitly in this milestone's own Event Handlers list as "Notification placeholder" — real, registered, genuinely invoked. AI-103 must NOT implement Notifications (this milestone's own explicit exclusion); this handler only names which events WOULD warrant a real notification once that integration exists (e.g. "your strategy was rejected"), never sending one. */
@Injectable()
export class NotificationPlaceholderHandler implements IntegrationEventHandler {
  private readonly logger = new Logger(NotificationPlaceholderHandler.name);

  private static readonly NOTIFIABLE_EVENTS = new Set(["StrategyApproved", "StrategyRejected", "StrategyPublished"]);

  async handle(event: IntegrationEvent): Promise<void> {
    if (!NotificationPlaceholderHandler.NOTIFIABLE_EVENTS.has(event.eventType)) return;
    this.logger.log(`[placeholder] would notify relevant users about "${event.eventType}" on ${event.aggregateType} ${event.aggregateId} — no real notification integration exists in this module yet (AI-103 explicitly excludes Notifications).`);
  }
}
