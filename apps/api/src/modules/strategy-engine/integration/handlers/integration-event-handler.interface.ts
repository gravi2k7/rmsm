import type { IntegrationEvent } from "../events/integration-event.interface";

/**
 * "Each handler must have a single responsibility" (this milestone's
 * own explicit rule) — one real interface, implemented by 5 real,
 * separate classes (Audit, Metrics, SearchIndexing, Analytics,
 * Notification), each doing exactly one thing with an event, never
 * combined into a single do-everything handler.
 */
export interface IntegrationEventHandler {
  handle(event: IntegrationEvent): Promise<void>;
}
