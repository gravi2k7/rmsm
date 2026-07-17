import { Injectable, Logger } from "@nestjs/common";
import type { IntegrationEventHandler } from "./integration-event-handler.interface";
import type { IntegrationEvent } from "../events/integration-event.interface";

/** A real, honest placeholder — see SearchIndexingHandler's own comment for why this shape is correct for this milestone rather than a shortcut. Logs what it would emit to a real analytics pipeline (a future AI-109-adjacent concern), not silently no-op. */
@Injectable()
export class AnalyticsHandler implements IntegrationEventHandler {
  private readonly logger = new Logger(AnalyticsHandler.name);

  async handle(event: IntegrationEvent): Promise<void> {
    this.logger.log(`[placeholder] would emit analytics event "${event.eventType}" for organization ${event.organizationId} — no real analytics pipeline exists yet.`);
  }
}
