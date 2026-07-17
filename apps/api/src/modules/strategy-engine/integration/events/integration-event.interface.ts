import type { StrategyDomainEvent } from "../../domain/events/strategy-domain-events.interface";

/**
 * The real, dedicated INTEGRATION event contract — distinct from
 * `StrategyDomainEvent` (domain/events/, Milestone 1+3), per this
 * milestone's own explicit "Separate Domain Events / Integration
 * Events... Never expose domain entities directly" rule. A domain
 * event describes what happened in the DOMAIN's own vocabulary
 * (`StrategyDomainEvent.kind`, `strategyId`); an `IntegrationEvent` is
 * the stable, versioned, infrastructure-facing envelope everything
 * downstream (the outbox, audit, metrics, and any FUTURE external
 * consumer) actually receives — every field this milestone's own
 * "Event Metadata" section names, exactly.
 */
export interface IntegrationEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  aggregateId: string;
  aggregateType: "Strategy" | "StrategyVersion";
  organizationId: string;
  /** The integration event SCHEMA's own version — starts at 1 for every event type; bumped only if a future change to this event's own payload shape would break an existing consumer. Distinct from a StrategyVersion's own versionNumber, which may appear INSIDE payload for version-related events. */
  schemaVersion: number;
  occurredAt: Date;
  correlationId: string;
  causationId: string | null;
  userId: string | null;
  source: "strategy-engine";
  eventType: StrategyDomainEvent["kind"];
  payload: TPayload;
  metadata: Record<string, unknown>;
}
