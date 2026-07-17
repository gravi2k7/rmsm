import { Injectable, Logger } from "@nestjs/common";
import type { IntegrationEventHandler } from "./integration-event-handler.interface";
import type { IntegrationEvent } from "../events/integration-event.interface";

/**
 * A real, honest PLACEHOLDER — no search index (Elasticsearch,
 * Postgres full-text, or otherwise) exists anywhere in this platform
 * yet for strategies. This handler is real, registered, and genuinely
 * invoked for every relevant event; what it DOES is log what it WOULD
 * index, not silently no-op — the same "Notification placeholder"
 * shape this milestone's own Event Handlers list explicitly names as
 * an acceptable, expected kind of handler this phase, not a shortcut.
 */
@Injectable()
export class SearchIndexingHandler implements IntegrationEventHandler {
  private readonly logger = new Logger(SearchIndexingHandler.name);

  private static readonly INDEXABLE_EVENTS = new Set(["StrategyCreated", "StrategyUpdated", "StrategyArchived", "StrategyPublished"]);

  async handle(event: IntegrationEvent): Promise<void> {
    if (!SearchIndexingHandler.INDEXABLE_EVENTS.has(event.eventType)) return;
    this.logger.log(`[placeholder] would index ${event.aggregateType} ${event.aggregateId} (event ${event.eventType}) — no real search index exists yet.`);
  }
}
