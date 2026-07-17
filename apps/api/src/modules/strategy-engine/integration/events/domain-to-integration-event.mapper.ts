import { randomUUID } from "crypto";
import type { StrategyDomainEvent } from "../../domain/events/strategy-domain-events.interface";
import type { IntegrationEvent } from "./integration-event.interface";

/**
 * The real translation boundary this milestone's own "never expose
 * domain entities directly, create dedicated contracts" rule requires.
 * A domain event's own `kind`/`strategyId`/`organizationId`/`actorId`/
 * `occurredAt` map onto the envelope's own equivalent fields; every
 * other domain-event-specific field becomes `payload` — the domain
 * event's own SHAPE never leaks through as-is, even though (for this
 * milestone) the payload happens to carry the same field names, since
 * nothing downstream should structurally depend on that being true
 * forever.
 */
export function toIntegrationEvent(domainEvent: StrategyDomainEvent, correlationId: string, causationId: string | null): IntegrationEvent {
  const { kind, organizationId, strategyId, actorId, occurredAt, ...rest } = domainEvent;

  // Any event carrying its own `strategyVersionId` field is version-
  // scoped — checking for the FIELD's presence, not an explicit
  // per-`kind` whitelist. The whitelist approach this function
  // originally used missed 2 real event types
  // (`StrategyVersionCreated`, `StrategyVersionRolledBack` — both
  // carry `strategyVersionId`/`newVersionId` but weren't in the
  // list), a real bug caught by this file's own test suite. Checking
  // the field directly can't drift out of sync with the event union
  // the way a hand-maintained kind list can.
  const versionScopedId = "strategyVersionId" in rest && typeof rest.strategyVersionId === "string" ? rest.strategyVersionId : "newVersionId" in rest && typeof rest.newVersionId === "string" ? rest.newVersionId : null;

  const aggregateId = versionScopedId ?? strategyId;
  const aggregateType: IntegrationEvent["aggregateType"] = versionScopedId !== null ? "StrategyVersion" : "Strategy";

  return {
    eventId: randomUUID(),
    aggregateId,
    aggregateType,
    organizationId,
    schemaVersion: 1,
    occurredAt,
    correlationId,
    causationId,
    userId: actorId,
    source: "strategy-engine",
    eventType: kind,
    payload: rest as Record<string, unknown>,
    metadata: {},
  };
}
