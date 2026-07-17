import { Injectable, Logger } from "@nestjs/common";
import type { IntegrationEvent } from "../events/integration-event.interface";
import type { IntegrationEventHandler } from "../handlers/integration-event-handler.interface";
import { AuditEventHandler } from "../handlers/audit-event.handler";
import { MetricsEventHandler } from "../handlers/metrics-event.handler";
import { SearchIndexingHandler } from "../handlers/search-indexing.handler";
import { AnalyticsHandler } from "../handlers/analytics.handler";
import { NotificationPlaceholderHandler } from "../handlers/notification-placeholder.handler";
import { StrategyEventMetricsService } from "../services/strategy-event-metrics.service";

/**
 * Deliverable 4: "Event Dispatcher" — routes one dequeued
 * `IntegrationEvent` to every registered handler. Each handler runs
 * independently: one handler throwing (e.g. a real future search-index
 * outage) does NOT prevent the others from running, and does NOT fail
 * the whole event — "Handle... Partial failures" (this milestone's own
 * explicit Failure Handling rule), applied at the handler-fan-out
 * level specifically. A handler failure IS recorded (via
 * `StrategyEventMetricsService.recordHandlerFailure`) and logged, but
 * the event as a whole is still considered successfully dispatched
 * (the outbox row moves to PUBLISHED) — a genuinely delivered-but-
 * partially-processed event is a real, different outcome from a
 * failed DELIVERY (which the outbox's own retry/poison logic in
 * `OutboxPublisherService` handles separately).
 */
@Injectable()
export class EventDispatcherService {
  private readonly logger = new Logger(EventDispatcherService.name);
  private readonly handlers: IntegrationEventHandler[];

  constructor(
    audit: AuditEventHandler,
    metrics: MetricsEventHandler,
    searchIndexing: SearchIndexingHandler,
    analytics: AnalyticsHandler,
    notificationPlaceholder: NotificationPlaceholderHandler,
    private readonly metricsService: StrategyEventMetricsService,
  ) {
    this.handlers = [audit, metrics, searchIndexing, analytics, notificationPlaceholder];
  }

  async dispatch(event: IntegrationEvent): Promise<void> {
    await Promise.all(
      this.handlers.map(async (handler) => {
        const start = Date.now();
        try {
          await handler.handle(event);
          this.metricsService.recordHandlerLatency(event.eventType, Date.now() - start);
        } catch (error) {
          this.metricsService.recordHandlerFailure(event.eventType);
          this.logger.warn(`correlationId=${event.correlationId} eventId=${event.eventId} handler=${handler.constructor.name} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }),
    );
  }
}
